import type { Metadata } from 'next';
import { LegalNav } from '@/components/LegalUI';

export const metadata: Metadata = {
  title: 'Terms of Service — iGlobals',
};

export default function TermsPage() {
  return (
    <>
      <LegalNav active="terms" />
      <h1 className="legal-title">Terms of Service</h1>
      <p className="legal-updated">Last updated July 26, 2026</p>

      <div className="legal-content">
        <h2>1. Acceptance of these terms</h2>
        <p>
          By creating an I-con account or signing in through iGlobals Central Auth
          (&quot;ICA&quot;), you agree to these terms. If you don&apos;t agree, don&apos;t create an
          account or use the service.
        </p>

        <h2>2. What ICA is</h2>
        <p>
          ICA is the identity and sign-in service used by iGlobals and by third-party applications
          that integrate with it through OAuth 2.0 / OpenID Connect. One account lets you sign in
          to iGlobals and to any app you choose to authorize, without creating a separate password
          everywhere.
        </p>

        <h2>3. Your account</h2>
        <p>You&apos;re responsible for:</p>
        <ul>
          <li>Providing accurate information when you register, and keeping it up to date.</li>
          <li>Keeping your password confidential and not sharing your account with anyone else.</li>
          <li>Telling us promptly if you suspect unauthorized access to your account.</li>
          <li>Everything that happens under your account once you&apos;re signed in, including actions taken by apps you&apos;ve authorized.</li>
        </ul>

        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Attempt to access another user&apos;s account or bypass our authentication or security controls.</li>
          <li>Use automated means to create accounts or probe the service beyond normal use.</li>
          <li>Interfere with or disrupt the integrity or performance of ICA or the apps connected to it.</li>
          <li>Use the service for anything unlawful or that infringes on others&apos; rights.</li>
        </ul>

        <h2>5. Third-party applications</h2>
        <p>
          When you approve a consent screen for a third-party app, you&apos;re authorizing that app to
          access the specific scopes you approved (for example, your name or email). That app&apos;s use
          of your information beyond those scopes is governed by its own terms and privacy policy,
          not this one. You can review and revoke any app&apos;s access at any time from your dashboard.
        </p>

        <h2>6. Suspension &amp; termination</h2>
        <p>
          We may suspend or terminate an account that violates these terms, poses a security risk,
          or shows signs of fraudulent or abusive activity. You may stop using the service and
          request account deletion at any time by contacting support.
        </p>

        <h2>7. Service availability &amp; disclaimers</h2>
        <p>
          We work to keep ICA available and secure, but the service is provided &quot;as is&quot;
          without warranties of any kind. We aren&apos;t liable for issues caused by third-party
          applications you&apos;ve chosen to authorize, or for outages beyond our reasonable control.
        </p>

        <h2>8. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. If we make material changes, we&apos;ll update
          the date above and, where appropriate, notify you directly. Continuing to use ICA after
          changes take effect means you accept the updated terms.
        </p>

        <h2>9. Contact us</h2>
        <p>
          Questions about these terms? Reach us at{' '}
          <a href="mailto:tech-support@tradelenda.com">tech-support@tradelenda.com</a>.
        </p>
      </div>
    </>
  );
}
