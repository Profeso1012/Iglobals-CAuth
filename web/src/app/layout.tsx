import type { Metadata } from 'next';
import './globals.css';
import './(auth)/auth-styles.css';

export const metadata: Metadata = {
  title: 'iGlobals Central — Secure Identity Platform',
  description: 'One identity across all iGlobals services. Secure, fast, and reliable authentication powered by iGlobals.',
  icons: { 
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'iGlobals Central Authentication',
    description: 'Secure identity platform connecting all iGlobals services',
    siteName: 'iGlobals Central',
    images: [{
      url: '/logo.png',
      width: 512,
      height: 512,
      alt: 'iGlobals Logo',
    }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iGlobals Central Authentication',
    description: 'Secure identity platform for all iGlobals services',
    images: ['/logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Google+Sans:wght@400;500;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
