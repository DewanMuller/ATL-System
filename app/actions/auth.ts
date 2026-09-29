"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { generateJoinCode, normalizeJoinCode } from "@/lib/joinCode";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";
import { getClientIp, isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { generateToken, hashToken } from "@/lib/tokens";
import { getBaseUrl } from "@/lib/url";
import { sendEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

class InvalidJoinCodeError extends Error {}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
// Always the same message shown to the user regardless of whether the email
// has an account, whether it was rate-limited, or whether sending
// succeeded — anything else would let an attacker tell accounts apart by
// the response they get back.
const RESET_REQUESTED_MESSAGE =
  "If that email has an account, we've sent a link to reset the password.";

// Covers both join-code brute forcing and mass throwaway-account spam from
// one source — every submission counts, not just failures, since a
// successful join still consumes the same IP's budget.
const SIGNUP_MAX_ATTEMPTS = 10;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

export async function signup(formData: FormData) {
  const ip = getClientIp(await headers());
  const rateLimitKey = `signup:ip:${ip}`;
  if (await isRateLimited(rateLimitKey, SIGNUP_MAX_ATTEMPTS, SIGNUP_WINDOW_MS)) {
    return { error: "Too many signup attempts. Please try again later." };
  }
  await recordAttempt(rateLimitKey);

  const businessName = String(formData.get("businessName") ?? "").trim();
  const joinCodeRaw = String(formData.get("joinCode") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!joinCodeRaw && !businessName) {
    return {
      error: "Enter a business name, or an invite code to join an existing team.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const hashed = await bcrypt.hash(password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      if (joinCodeRaw) {
        const joinCode = normalizeJoinCode(joinCodeRaw);
        const business = await tx.business.findUnique({ where: { joinCode } });
        if (!business) throw new InvalidJoinCodeError();

        const user = await tx.user.create({
          data: { email, password: hashed, name: name || null },
        });
        await tx.membership.create({
          data: { userId: user.id, businessId: business.id, role: "MEMBER" },
        });
      } else {
        const user = await tx.user.create({
          data: {
            email,
            password: hashed,
            name: name || null,
            business: { create: { name: businessName, joinCode: generateJoinCode() } },
          },
          include: { business: true },
        });
        await tx.membership.create({
          data: { userId: user.id, businessId: user.business!.id, role: "OWNER" },
        });
      }
    });
  } catch (error) {
    if (error instanceof InvalidJoinCodeError) {
      return { error: "That invite code doesn't match any business." };
    }
    throw error;
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { message: RESET_REQUESTED_MESSAGE };

  // Rate-limited by IP and by email so the same endpoint can't be used to
  // spam an inbox with reset emails or to probe which emails have accounts
  // by timing/volume — both checks fail silently into the same generic
  // message rather than a distinct "too many attempts" error.
  const ip = getClientIp(await headers());
  const limited =
    (await isRateLimited(`pwreset:ip:${ip}`, 5, 60 * 60 * 1000)) ||
    (await isRateLimited(`pwreset:email:${email}`, 3, 60 * 60 * 1000));
  if (limited) return { message: RESET_REQUESTED_MESSAGE };
  await Promise.all([recordAttempt(`pwreset:ip:${ip}`), recordAttempt(`pwreset:email:${email}`)]);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const rawToken = generateToken();
    const baseUrl = await getBaseUrl();

    await prisma.$transaction([
      // Only one live reset link per user at a time.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your Above The Line password",
        html: `
          <p>Someone requested a password reset for your Above The Line account.</p>
          <p><a href="${baseUrl}/reset-password?token=${rawToken}">Reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } catch (error) {
      // A send failure must not crash the page or change what the user
      // sees — either would leak that this email has an account. The
      // token still exists in the DB either way; Sentry gets the real
      // failure for us to actually notice and fix.
      Sentry.captureException(error);
    }
  }

  return { message: RESET_REQUESTED_MESSAGE };
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return { error: "This reset link is invalid. Request a new one." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  await signIn("credentials", {
    email: resetToken.user.email,
    password,
    redirectTo: "/dashboard",
  });
}

export async function logout() {
  // Clear any live impersonation session so it can't carry over to whoever
  // logs in next on this browser (see lib/impersonation.ts).
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);

  await signOut({ redirectTo: "/login" });
}
