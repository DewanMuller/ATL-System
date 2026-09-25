import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, recordAttempt } from "@/lib/rateLimit";

class TooManyAttemptsError extends CredentialsSignin {
  code = "too_many_attempts";
}

// Three independent windows, checked before touching the password hash:
// - (ip, email): stops one attacker brute-forcing one account
// - email alone: stops the same attack spread across many IPs
// - ip alone: stops one attacker spraying many different emails
// All three `key` functions share the same (ip, email) signature — even
// though two of them ignore one param — so indexing into this array gives
// TypeScript one concrete function shape instead of a union of different
// arities (which would force every call site to satisfy the strictest one).
const LOGIN_LIMITS = [
  { key: (ip: string, email: string) => `login:ipemail:${ip}:${email}`, max: 5, windowMs: 15 * 60 * 1000 },
  { key: (_ip: string, email: string) => `login:email:${email}`, max: 15, windowMs: 60 * 60 * 1000 },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for a uniform (ip, email) shape across all three, see comment above
  { key: (ip: string, _email: string) => `login:ip:${ip}`, max: 30, windowMs: 15 * 60 * 1000 },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const ip = getClientIp(request.headers);
        const keys = LOGIN_LIMITS.map((limit) => limit.key(ip, email));
        for (const [i, limit] of LOGIN_LIMITS.entries()) {
          if (await isRateLimited(keys[i], limit.max, limit.windowMs)) {
            throw new TooManyAttemptsError();
          }
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await Promise.all(keys.map(recordAttempt));
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          await Promise.all(keys.map(recordAttempt));
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isSuperAdmin = user.isSuperAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = token.isSuperAdmin ?? false;
      }
      return session;
    },
  },
});
