import type { Metadata } from 'next';
import { LegalNav } from '@/components/LegalUI';

export const metadata: Metadata = {
  title: 'Help — iGlobals',
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'How do I sign in?',
    a: 'Go to the sign-in page and enter the email address on your I-con account, then your password. If your account was created with Google, use the "Continue with Google" button instead — Google accounts don’t have a separate iGlobals password unless you set one from Security settings.',
  },
  {
    q: 'I never received my verification code',
    a: 'Codes are sent by email or SMS and expire after a short window. Check your spam folder for email codes. If nothing arrives after a minute, use the "Resend code" button on the verification screen — it’s rate-limited to prevent abuse, so wait for the countdown before requesting another.',
  },
  {
    q: 'I forgot my password',
    a: 'Use "Forgot password?" on the sign-in page and enter your email. We’ll send a reset link that’s valid for a limited time. If you signed up with Google and never set a password, sign in with Google first, then set one from Security settings.',
  },
  {
    q: 'What is a "connected app" or "authorized app"?',
    a: 'iGlobals Central Auth (ICA) is the single sign-in system behind iGlobals and a number of partner apps. When you approve a consent screen for one of those apps, it can read the specific pieces of your profile you approved (for example, your name or email) without you re-entering a password there. You can review or revoke access for any app from the Apps page at any time.',
  },
  {
    q: 'How do I revoke access for an app I no longer use?',
    a: 'Sign in, open the Apps page from your dashboard, and remove the app from your authorized list. This immediately invalidates its ability to act on your behalf; you can always re-authorize it later if you sign in there again.',
  },
  {
    q: 'How do I sign out of every device?',
    a: 'Open Security settings and use the option to end all active sessions. This is also the right move if you think your account may have been accessed from a device that isn’t yours.',
  },
  {
    q: 'How do I change my email, phone, or name?',
    a: 'These live under your Profile page once signed in. Changing your phone number will mark it as unverified again until you confirm the new number with a fresh code.',
  },
  {
    q: 'I need something else',
    a: <>Reach us directly at <a href="mailto:tech-support@tradelenda.com">tech-support@tradelenda.com</a> and we’ll get back to you as soon as we can.</>,
  },
];

export default function HelpPage() {
  return (
    <>
      <LegalNav active="help" />
      <h1 className="legal-title">Help center</h1>
      <p className="legal-updated">Answers to the most common questions about your I-con account.</p>

      <div className="help-faq">
        {FAQS.map(({ q, a }) => (
          <div className="help-faq-item" key={q}>
            <p className="help-faq-q">{q}</p>
            <p className="help-faq-a">{a}</p>
          </div>
        ))}
      </div>
    </>
  );
}
