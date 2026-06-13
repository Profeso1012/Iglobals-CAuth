'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, Shield, Grid3x3, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(setUser);
  }, []);

  if (!user) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-primary" style={{ width: 32, height: 32 }} /></div>;

  const cards = [
    { href: '/profile', icon: Mail, color: 'var(--ig-blue)', title: 'Profile',   desc: 'Manage your name, phone and address' },
    { href: '/security', icon: Shield, color: 'var(--ig-green)', title: 'Security', desc: 'Change password and manage sessions' },
    { href: '/apps', icon: Grid3x3, color: 'var(--ig-red)', title: 'Apps',  desc: 'Review and revoke app permissions' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          Welcome, <span className="ig-gradient-text">{user.first_name}</span>
        </h1>
        <p className="page-desc">This is your iGlobals I-con control panel.</p>
      </div>

      {!user.email_verified && (
        <div className="verify-banner">
          <AlertCircle size={16} />
          <div>
            Your email is not yet verified.{' '}
            <Link href="/verify-email" style={{ fontWeight: 600 }}>Verify now</Link>
            {' '}to unlock full access.
          </div>
        </div>
      )}

      {/* Quick-stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Email', value: user.email, verified: user.email_verified },
          { label: 'Phone', value: user.phone || 'Not set', verified: user.phone_verified },
        ].map(({ label, value, verified }) => (
          <div key={label} className="section-card" style={{ margin: 0 }}>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
              <span className={`badge ${verified ? 'badge-green' : 'badge-red'}`} style={{ marginTop: 8 }}>
                {verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {cards.map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="section-card" style={{ margin: 0, transition: 'box-shadow 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <div style={{ padding: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon size={22} color={color} />
                </div>
                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
