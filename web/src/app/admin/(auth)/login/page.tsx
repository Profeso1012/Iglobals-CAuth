'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  async function requestCode() {
    setError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error_description || 'Sign-in failed.');
        return false;
      }
      setCountdown(60);
      return true;
    } catch {
      setError('Network error. Try again.');
      return false;
    }
  }

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !secret) return;
    setLoading(true);
    const ok = await requestCode();
    setLoading(false);
    if (ok) {
      setStep('otp');
      setTimeout(() => refs.current[0]?.focus(), 50);
    }
  }

  async function handleResend() {
    setResending(true);
    await requestCode();
    setResending(false);
  }

  function handleOtpInput(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every(d => d !== '')) handleVerify(next.join(''));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function handleVerify(code?: string) {
    const finalOtp = code || otp.join('');
    if (finalOtp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: finalOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error_description || 'Verification failed.');
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
        return;
      }
      router.push('/admin');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
          <div className="avatar avatar-lg" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <ShieldCheck size={28} />
          </div>
        </div>
        <h1 className="auth-title" style={{ textAlign: 'center' }}>Enter your code</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>We sent a 6-digit code to {email}.</p>

        {error && (
          <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>
        )}

        <div className="otp-grid">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="otp-cell"
              value={digit}
              onChange={e => handleOtpInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              disabled={loading}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => handleVerify()} disabled={loading || otp.join('').length !== 6}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <button className="btn btn-ghost" onClick={handleResend} disabled={resending || countdown > 0}>
            {resending ? <span className="spinner spinner-primary" /> : <RefreshCw size={16} />}
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
          </button>
          <button
            type="button"
            className="auth-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
            onClick={() => { setStep('credentials'); setOtp(['', '', '', '', '', '']); setError(''); }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
        <div className="avatar avatar-lg" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          <ShieldCheck size={28} />
        </div>
      </div>
      <h1 className="auth-title" style={{ textAlign: 'center' }}>Admin access</h1>
      <p className="auth-subtitle" style={{ textAlign: 'center' }}>Sign in with the admin passphrase and your admin email — we'll email you a one-time code.</p>

      {error && (
        <div className="alert alert-error" style={{ textAlign: 'left' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCredentialsSubmit}>
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label className="form-label" htmlFor="admin-email">Admin email</label>
          <input
            id="admin-email"
            type="email"
            className="form-input form-input-no-icon"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            disabled={loading}
            autoFocus
          />
        </div>
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label className="form-label" htmlFor="admin-secret">Passphrase</label>
          <input
            id="admin-secret"
            type="password"
            className="form-input form-input-no-icon"
            value={secret}
            onChange={e => { setSecret(e.target.value); setError(''); }}
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading || !secret || !email}>
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Sending code…' : 'Send code'}
        </button>
      </form>
    </div>
  );
}
