import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

// Temporary — verifying the Resend domain setup actually delivers before
// building the real password-reset/verification flows on top of it.
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Pass ?to=you@example.com" }, { status: 400 });
  }

  await sendEmail({
    to,
    subject: "Above The Line — test email",
    html: "<p>If you're reading this, Resend + DNS are wired up correctly.</p>",
  });

  return NextResponse.json({ sent: true, to });
}
