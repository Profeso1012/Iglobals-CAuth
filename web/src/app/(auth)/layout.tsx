export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* iGlobals rainbow top bar */}
      <div className="ig-gradient-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999 }} />
      {children}
    </>
  );
}
