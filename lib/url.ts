import { headers } from "next/headers";

// Builds an absolute URL for links emailed to users (password reset, email
// verification). Reads the actual request host/protocol rather than a
// hardcoded env var, so it's correct on localhost, preview deployments, and
// production without separate configuration for each.
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
