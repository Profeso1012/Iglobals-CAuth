export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Dark/light mode detection */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            })();
          `,
        }}
      />
      {children}
    </>
  );
}
