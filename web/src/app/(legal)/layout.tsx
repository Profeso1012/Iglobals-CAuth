import { LegalTopbar } from '@/components/LegalUI';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal-screen">
      <LegalTopbar />
      <div className="legal-card">{children}</div>
    </div>
  );
}
