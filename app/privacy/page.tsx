import Link from "next/link";

const EFFECTIVE_DATE = "30 September 2026";
const CONTACT_EMAIL = "ben@businessgamechangers.co.za";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href="/" className="text-sm font-medium text-zinc-500 underline dark:text-zinc-400">
          ← Back to Above The Line
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Privacy Policy
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Effective date: {EFFECTIVE_DATE}
        </p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <Section title="1. Who we are">
          <p>
            Business Game Changers (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates Above
            The Line (the &quot;Service&quot;), a strategic execution platform that helps
            businesses manage BHAGs, OKRs, and related planning tools.
          </p>
          <p>
            Contact: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <br />
            Registered address: <em>[Business Game Changers registered address — to be added]</em>
          </p>
        </Section>

        <Section title="2. Information we collect">
          <ul className="list-disc pl-5">
            <li>
              <strong>Account information:</strong> your name (optional), email address, and a
              securely hashed password. We never store your password in plain text.
            </li>
            <li>
              <strong>Business information:</strong> your business&apos;s name, its invite (&quot;join&quot;)
              code, and your role within it (Owner or Member).
            </li>
            <li>
              <strong>Content you provide:</strong> information you or your team enter into the
              Service — objectives, key results, initiatives, BHAG metrics, RACI assignments,
              Winning Moves, Next Steps, Issues, and Weekly/Monthly/Quarterly review submissions
              (including self-reported wellbeing scores and free-text notes).
            </li>
            <li>
              <strong>Technical information:</strong> your IP address, held temporarily for
              security purposes (see &quot;Security&quot; below).
            </li>
          </ul>
        </Section>

        <Section title="3. How we use your information">
          <ul className="list-disc pl-5">
            <li>to provide and operate the Service for your business</li>
            <li>to authenticate you and keep your account secure</li>
            <li>to send account-related email (verifying your email address, resetting your password)</li>
            <li>to detect and prevent abuse, such as automated attempts to guess passwords or brute-force invite codes</li>
            <li>to identify and fix technical problems</li>
          </ul>
          <p>We do not sell your personal information, and we do not use it for advertising.</p>
        </Section>

        <Section title="4. Who we share it with (sub-processors)">
          <p>
            We use the following third-party service providers to operate the Service. Each
            only receives the information it needs to perform its function:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Turso</strong> — database hosting (stores all Service data; hosted in the EU)</li>
            <li><strong>Vercel</strong> — application hosting</li>
            <li><strong>Resend</strong> — sends transactional email (password resets, verification emails) on our behalf</li>
            <li><strong>Sentry</strong> — error monitoring, to help us detect and fix technical problems</li>
          </ul>
          <p>
            Because some of these providers operate outside South Africa, using the Service
            means your information may be processed outside South Africa. We take reasonable
            steps to use providers with appropriate data protection commitments in place.
          </p>
        </Section>

        <Section title="5. How long we keep your information">
          <p>
            We retain your information for as long as your account and business remain active
            on the Service. If you&apos;d like your account or your business&apos;s data deleted,
            contact us at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
            we will action your request, subject to any legal obligation to retain certain
            records.
          </p>
          <p>
            Security-related IP address records used for abuse prevention are automatically
            deleted after 24 hours.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>We use a small number of strictly necessary cookies:</p>
          <ul className="list-disc pl-5">
            <li>a session cookie, to keep you signed in (cannot be read by scripts on the page)</li>
            <li>
              for administrators only: a temporary cookie used while viewing a business&apos;s
              account for support purposes, which is logged and can be ended at any time
            </li>
          </ul>
          <p>We do not use advertising or tracking cookies.</p>
        </Section>

        <Section title="7. Your rights">
          <p>
            Under South Africa&apos;s Protection of Personal Information Act (POPIA), you have
            the right to:
          </p>
          <ul className="list-disc pl-5">
            <li>ask what personal information we hold about you</li>
            <li>ask us to correct inaccurate information</li>
            <li>ask us to delete your information (subject to the retention note above)</li>
            <li>object to certain processing, and lodge a complaint with the Information Regulator</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We take reasonable technical measures to protect your information, including:
            hashed (never plain-text) passwords, rate limiting on login and signup to slow down
            automated attacks, encrypted connections (HTTPS) for all traffic, and restricted
            internal access to production data. No system is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            The Service is intended for business use by adults. We do not knowingly collect
            information from children.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. We&apos;ll update the effective date
            above when we do, and will communicate material changes to business owners.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions about this policy, or to exercise your rights:{" "}
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
