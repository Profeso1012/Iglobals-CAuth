import type { Metadata } from 'next';
import { LegalNav } from '@/components/LegalUI';

export const metadata: Metadata = {
  title: 'Privacy Policy — iGlobals',
};

export default function PrivacyPage() {
  return (
    <>
      <LegalNav active="privacy" />
      <h1 className="legal-title">Privacy Policy</h1>
      <p className="legal-updated">Last updated July 26, 2026</p>

      <div className="legal-content">
        <h2>Overview</h2>
        <p>
          iGlobals Central Auth (&quot;ICA&quot;, &quot;we&quot;, &quot;us&quot;) is the shared sign-in
          service behind iGlobals and the third-party applications you choose to connect to your
          I-con account. This policy explains what we collect, why we collect it, and the choices
          you have. It applies to ica accounts created through this service, not to the third-party
          apps themselves once you&apos;ve authorized them — those apps have their own privacy practices
          for whatever they do with the information you share.
        </p>

        <h2>Information we collect</h2>
        <p>When you create an account, we collect:</p>
        <ul>
          <li><strong>Identity details</strong> you provide — first name, last name, email address, and optionally a phone number.</li>
          <li><strong>Your password</strong>, which is hashed with bcrypt before it ever touches our database. We cannot see, recover, or read your plaintext password — not even to help you.</li>
          <li><strong>Verification status</strong> for your email and phone, and any address details you choose to add to your profile.</li>
          <li><strong>Session and security metadata</strong> — sign-in timestamps, IP address, and browser/device information, so we can show you your active sessions and flag anything unusual.</li>
          <li><strong>Consent records</strong> — which third-party applications you&apos;ve authorized, and exactly which scopes (for example, profile or email) you approved for each one.</li>
        </ul>

        <h2>How we use it</h2>
        <p>We use this information to:</p>
        <ul>
          <li>Authenticate you and keep your account secure.</li>
          <li>Let you sign in to iGlobals and any connected third-party app without re-entering credentials everywhere.</li>
          <li>Send service messages you&apos;ve requested — verification codes, password-reset links, and security alerts.</li>
          <li>Detect and respond to suspicious sign-in activity.</li>
        </ul>
        <p>We do not use your data for advertising, and we do not sell it.</p>

        <h2>What we share, and with whom</h2>
        <p>
          We share profile information with a third-party application only after you explicitly
          approve its consent screen, and only the specific scopes you approved — never your
          password, and never more than what was requested and granted. You can review or revoke
          any app&apos;s access at any time from the Apps page in your dashboard; revoking access takes
          effect immediately.
        </p>

        <h2>Data retention &amp; security</h2>
        <p>
          Passwords are stored only as bcrypt hashes. Session tokens are hashed at rest and expire
          automatically. Traffic to and from ICA is encrypted in transit. We keep account and audit
          data for as long as your account is active, plus a limited period afterward for security
          and legal purposes, after which it is deleted or anonymized.
        </p>

        <h2>Your choices</h2>
        <p>From your dashboard you can, at any time:</p>
        <ul>
          <li>View and edit your profile information.</li>
          <li>Revoke any connected app&apos;s access.</li>
          <li>Sign out of one session or every active session at once.</li>
          <li>Request deletion of your account by contacting support.</li>
        </ul>

        <h2>Children&apos;s privacy</h2>
        <p>
          ICA is not directed at children, and we do not knowingly collect information from anyone
          under the age required by their local law to hold an account. If you believe a child has
          created an account, contact us and we will remove it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If we make material changes to this policy, we&apos;ll update the date above and, where
          appropriate, notify you directly.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy or your data? Reach us at{' '}
          <a href="mailto:tech-support@tradelenda.com">tech-support@tradelenda.com</a>.
        </p>
      </div>
    </>
  );
}
