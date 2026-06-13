'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function VerifyPhonePage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { handleResend(); }, []);
  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  function handleInput(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every(d => d)) handleVerify(next.join(''));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function handleVerify(code?: string) {
    const finalOtp = code || otp.join('');
    if (finalOtp.length !== 6) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: finalOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_otp: 'Incorrect code. Please try again.',
          otp_expired: 'Code expired. Request a new one.',
          too_many_attempts: 'Too many attempts. Request a new code.',
        };
        setError(map[data.error] || data.error_description || 'Verification failed.');
        setOtp(['', '', '', '', '', '']); refs.current[0]?.focus(); return;
      }
      setSuccess('Phone verified successfully!');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    setResending(true);
    await fetch('/api/auth/send-phone-verification', { method: 'POST', credentials: 'include' });
    setCountdown(60); setResending(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
      <div className="auth-logo"><img src="/logo.png" alt="iGlobals" style={{ height: 40 }} /></div>
      <div style={{ width: 56, height: 56, background: 'var(--color-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Phone size={24} color="var(--color-primary)" />
      </div>
      <h1 className="auth-title">Verify your phone</h1>
      <p className="auth-subtitle">We sent a 6-digit code via SMS to your registered number.</p>
      {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}
      {success && <div className="alert alert-success"><CheckCircle size={16} /><span>{success}</span></div>}
      <div className="otp-grid">
        {otp.map((d, i) => (
          <input key={i} ref={el => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
            className="otp-cell" value={d} onChange={e => handleInput(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)} aria-label={`Digit ${i + 1}`} disabled={loading || !!success} />
        ))}
      </div>
      <button id="btn-verify-phone" className="btn btn-primary btn-full" onClick={() => handleVerify()} disabled={loading || otp.join('').length !== 6 || !!success}>
        {loading ? <span className="spinner" /> : null}{loading ? 'Verifying…' : 'Verify phone'}
      </button>
      <button id="btn-resend-phone" className="btn btn-ghost btn-full" style={{ marginTop: 12 }} onClick={handleResend} disabled={resending || countdown > 0}>
        {resending ? <span className="spinner spinner-primary" /> : <RefreshCw size={16} />}
        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
      </button>
      </div>
    </div>
  );
}
