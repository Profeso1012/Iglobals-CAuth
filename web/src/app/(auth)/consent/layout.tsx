import type { Metadata } from 'next';
import './consent.css';

export const metadata: Metadata = {
  title: 'Authorize — iGlobals',
};

export default function ConsentLayout({ children }: { children: React.ReactNode }) {
  return children;
}