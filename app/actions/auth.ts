"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { generateJoinCode, normalizeJoinCode } from "@/lib/joinCode";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";

class InvalidJoinCodeError extends Error {}

export async function signup(formData: FormData) {
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

export async function logout() {
  // Clear any live impersonation session so it can't carry over to whoever
  // logs in next on this browser (see lib/impersonation.ts).
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);

  await signOut({ redirectTo: "/login" });
}
