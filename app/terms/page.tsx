import Link from "next/link";

const EFFECTIVE_DATE = "30 September 2026";
const CONTACT_EMAIL = "ben@businessgamechangers.co.za";

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href="/" className="text-sm font-medium text-zinc-500 underline dark:text-zinc-400">
          ← Back to Above The Line
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Terms of Service
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of Above The
          Line (the &quot;Service&quot;), provided by Business Game Changers (&quot;Company&quot;,
          &quot;we&quot;, &quot;us&quot;). By creating an account or using the Service, you agree to
          these Terms on behalf of yourself and, if applicable, the business you represent.
        </p>

        <Section title="1. The Service">
          <p>
            Above The Line is a strategic execution platform that helps businesses manage
            BHAGs, OKRs, and related planning, review, and accountability workflows.
          </p>
        </Section>

        <Section title="2. Accounts">
          <ul className="list-disc pl-5">
            <li>You must provide accurate information when creating an account and keep your login credentials confidential.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>
              The person who creates a business account (&quot;Owner&quot;) is responsible for
              managing who joins that business via the invite code, and for that business&apos;s
              use of the Service.
            </li>
            <li>
              You must be legally able to enter into these Terms, and if you&apos;re using the
              Service on behalf of a business, you confirm you&apos;re authorized to do so.
            </li>
          </ul>
        </Section>

        <Section title="3. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5">
            <li>use the Service for any unlawful purpose</li>
            <li>attempt to gain unauthorized access to any account, business, or part of the Service</li>
            <li>interfere with or disrupt the Service, including attempting to bypass security or rate-limiting controls</li>
            <li>share your business&apos;s invite code publicly or with anyone not authorized to join your business</li>
            <li>use the Service to store or transmit unlawful, defamatory, or infringing content</li>
          </ul>
        </Section>

        <Section title="4. Your data">
          <p>
            You (or your business) retain ownership of the content and data you enter into the
            Service — objectives, reviews, notes, and similar. We only use it to provide the
            Service to you, as described in our{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="5. Availability and activation">
          <p>
            Access to Above The Line&apos;s modules is activated by Business Game Changers,
            typically as part of a separate commercial agreement with your business. We aim to
            keep the Service available and reliable but do not guarantee uninterrupted access.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            The Service itself — including its design, software, and underlying methodology —
            is owned by Business Game Changers. These Terms don&apos;t grant you any rights to
            our intellectual property beyond your right to use the Service as intended.
          </p>
        </Section>

        <Section title="7. Termination">
          <ul className="list-disc pl-5">
            <li>You may stop using the Service, or ask us to close your business&apos;s account, at any time by contacting us.</li>
            <li>We may suspend or terminate access to the Service if we reasonably believe these Terms have been violated, or if required by law.</li>
          </ul>
        </Section>

        <Section title="8. Disclaimers">
          <p>
            The Service is provided &quot;as is&quot;. While we work to keep it accurate and
            available, we do not guarantee that it will be error-free, uninterrupted, or fit
            for any specific purpose. You are responsible for the business decisions you make
            using information in the Service.
          </p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>
            To the maximum extent permitted by law, Business Game Changers will not be liable
            for any indirect, incidental, or consequential damages arising from your use of the
            Service.
          </p>
        </Section>

        <Section title="10. Changes to these Terms">
          <p>
            We may update these Terms from time to time. We&apos;ll update the effective date
            above when we do, and will notify business owners of material changes.
          </p>
        </Section>

        <Section title="11. Governing law">
          <p>These Terms are governed by the laws of South Africa.</p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these Terms:{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      {children}
    </section>
  );
}
