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
const LOGIN_LIMITS = [
  { key: (ip: string, email: string) => `login:ipemail:${ip}:${email}`, max: 5, windowMs: 15 * 60 * 1000 },
  { key: (_ip: string, email: string) => `login:email:${email}`, max: 15, windowMs: 60 * 60 * 1000 },
  { key: (ip: string) => `login:ip:${ip}`, max: 30, windowMs: 15 * 60 * 1000 },
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
        const keys = [
          LOGIN_LIMITS[0].key(ip, email),
          LOGIN_LIMITS[1].key(ip, email),
          LOGIN_LIMITS[2].key(ip),
        ];
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
