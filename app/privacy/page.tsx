import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/register" className="text-sm font-medium text-brand-600 hover:underline">
        &larr; Back to registration
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-brand-900">Data Privacy Notice</h1>
      <p className="mt-1 text-sm text-slate-500">
        Regis Marie College Document Request System &mdash; issued in line with Republic Act No. 10173
        (Data Privacy Act of 2012).
      </p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-base font-semibold text-brand-900">What we collect</h2>
          <p>
            To process document requests we collect: your full name, student number, course,
            year level, enrollment status, email address, and mobile number. The document requests
            you submit (document type, purpose, copies) and payment details are also retained as
            part of the official transaction record.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-900">Why we collect it</h2>
          <p>
            This information is used to verify your identity against the college&apos;s records,
            process and track your document requests, notify you by email or SMS about payment and
            pickup, and produce reports required by the registrar&apos;s office.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-900">Who we share it with</h2>
          <p>
            Only authorized staff (the registrar and system administrators) have access. Your data is
            stored on secure cloud infrastructure and is never sold or shared for marketing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-900">How long we keep it</h2>
          <p>
            Records are kept for as long as required by college policy and applicable law, after
            which they are securely disposed.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-brand-900">Your rights</h2>
          <p>
            Under the Data Privacy Act you may request access to, correction of, or deletion of your
            personal data. Contact the Registrar&apos;s Office at the school to exercise these rights.
          </p>
        </section>
      </div>
    </main>
  );
}