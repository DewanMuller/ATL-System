import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isDev = process.env.NODE_ENV === "development";

// 'unsafe-inline' on script-src is required here (not just permissive by
// choice): Next.js embeds its own hydration/RSC payload as inline <script>
// tags with no nonce unless you adopt the nonce-based proxy pattern, which
// forces every page into dynamic rendering (losing static optimization on
// /login and /signup) and adds real complexity. This app has no
// dangerouslySetInnerHTML anywhere, so the main practical CSP benefit —
// blocking a script tag pointing at an attacker-controlled external
// domain — still holds; only inline-script injection specifically isn't
// covered. connect-src includes Sentry's ingest domain for browser error
// reporting (instrumentation-client.ts).
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  connect-src 'self' https://*.sentry.io;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          // HSTS is ignored by browsers over plain HTTP, so it's safe to
          // always send — Vercel serves this app over HTTPS regardless.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Belt-and-suspenders with the CSP's frame-ancestors 'none'
          // above, for older browsers that don't support that directive.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
});
