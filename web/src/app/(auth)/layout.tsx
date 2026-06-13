import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-center animate-fade-in">
      {/* Rainbow top bar */}
      <div className="ig-gradient-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999 }} />
      {children}
      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        &copy; {new Date().getFullYear()} iGlobals. All rights reserved.
      </p>
    </div>
  );
}
