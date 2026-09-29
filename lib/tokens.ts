import { randomBytes, createHash } from "node:crypto";

// The raw token is what goes in the emailed link — high enough entropy
// (256 bits) that guessing it is infeasible regardless of rate limiting.
// Only hashToken()'s output is ever stored in the database (password reset,
// and later email verification), so a database leak alone can't be used to
// act as a token holder — same principle as never storing plain passwords.
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
