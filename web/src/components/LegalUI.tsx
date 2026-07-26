import Link from 'next/link';

const NAV: { href: string; label: string }[] = [
  { href: '/help', label: 'Help' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function LegalTopbar() {
  return (
    <div className="legal-topbar">
      <Link href="/login" className="legal-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="iGlobals" />
        iGlobals
      </Link>
      <Link href="/login" className="legal-back">Back to sign in</Link>
    </div>
  );
}

export function LegalNav({ active }: { active: 'help' | 'privacy' | 'terms' }) {
  return (
    <nav className="legal-nav">
      {NAV.map(item => (
        <Link key={item.href} href={item.href} className={item.href === `/${active}` ? 'active' : ''}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
