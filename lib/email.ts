import { Resend } from "resend";

// Constructed lazily, inside sendEmail() — not at module scope — because
// the Resend client throws synchronously if the key is missing, and this
// module gets imported (so evaluated) during Next's build-time page-data
// collection even for routes that never actually call sendEmail. Local dev
// has no RESEND_API_KEY by design (see .env.example); this way that's only
// a problem if sendEmail is actually invoked, not merely imported.

// DKIM is published at resend._domainkey.businessgamechangers.co.za (the
// root domain), so mail sent as @businessgamechangers.co.za is what gets
// signed. The separate MX/SPF records at the "send" subdomain are Resend's
// custom Return-Path (bounce handling / SPF alignment only) — they don't
// change what the visible From: address should be.
const FROM = "Above The Line <noreply@businessgamechangers.co.za>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
}
