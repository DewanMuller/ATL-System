import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    isSuperAdmin?: boolean;
  }
}

// next-auth/jwt re-exports its JWT type from @auth/core/jwt via `export *`,
// which TypeScript's declaration merging does not follow through — augmenting
// "next-auth/jwt" directly is silently a no-op. Augmenting the real owning
// module is what actually adds these fields to the callback's `token` type.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    isSuperAdmin?: boolean;
  }
}
