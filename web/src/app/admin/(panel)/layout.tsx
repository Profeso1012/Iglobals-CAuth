'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Grid3x3, Users, LogOut, Menu, X, ShieldCheck } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/clients', label: 'Clients', icon: Grid3x3, exact: false },
  { href: '/admin/users', label: 'Users', icon: Users, exact: false },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth/session', { credentials: 'include' })
      .then(async res => {
        if (res.status === 401) { router.push('/admin/login'); return; }
        const data = await res.json();
        setAdminEmail(data.email || null);
        setLoading(false);
      })
      .catch(() => router.push('/admin/login'));
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/admin/login');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner spinner-primary" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="dashboard-layout">
      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="iGlobals" style={{ height: 28 }} />
        </div>

        <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <ShieldCheck size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>Admin</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {adminEmail || 'Control panel'}
            </p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-title">Manage</p>
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link${(exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')) ? ' active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }} onClick={handleLogout}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="ig-gradient-bar" />
        <div className="page-content page-content-wide animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
