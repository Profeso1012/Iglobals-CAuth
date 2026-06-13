'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, User, Shield, Grid3x3, LogOut, AlertCircle } from 'lucide-react';

interface ICAUser {
  id: string; email: string; email_verified: boolean; phone: string | null;
  phone_verified: boolean; first_name: string; last_name: string;
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile',   label: 'Profile',   icon: User },
  { href: '/security',  label: 'Security',  icon: Shield },
  { href: '/apps',      label: 'Apps',      icon: Grid3x3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ICAUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.status === 401) { router.push('/login'); return null; }
        return res.json();
      })
      .then(data => { if (data) setUser(data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', body: JSON.stringify({ global: false }), headers: { 'Content-Type': 'application/json' } });
    router.push('/login');
  }

  function getInitials(u: ICAUser) {
    return `${u.first_name[0]}${u.last_name[0]}`.toUpperCase();
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner spinner-primary" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="iGlobals" style={{ height: 28 }} />
        </div>

        {/* User avatar + name */}
        {user && (
          <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar">{getInitials(user)}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.first_name} {user.last_name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
          </div>
        )}

        {!user?.email_verified && (
          <div style={{ margin: '0 12px 8px', padding: '8px 12px', background: 'var(--color-warning-light)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#7c5c00' }}>
            <AlertCircle size={14} /> Email unverified
          </div>
        )}

        <nav className="sidebar-nav">
          <p className="sidebar-section-title">I-con Portal</p>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link${pathname === href || pathname.startsWith(href + '/') ? ' active' : ''}`}
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

      {/* Main */}
      <main className="main-content">
        <div className="ig-gradient-bar" />
        <div className="page-content animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
