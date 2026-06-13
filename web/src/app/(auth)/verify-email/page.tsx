'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-send on mount
    handleResend();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  function handleInput(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
    if (next.every(d => d !== '')) handleVerify(next.join(''));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(code?: string) {
    const finalOtp = code || otp.join('');
    if (finalOtp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp: finalOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_otp: 'That code is incorrect. Please check and try again.',
          otp_expired: 'Your code has expired. Request a new one.',
          too_many_attempts: 'Too many attempts. Please request a new code.',
        };
        setError(map[data.error] || data.error_description || 'Verification failed.');
        setOtp(['', '', '', '', '', '']);
        refs.current[0]?.focus();
        return;
      }
      setSuccess('Email verified successfully! Redirecting…');
      const redirect = sessionStorage.getItem('post_verify_redirect');
      setTimeout(() => {
        if (redirect?.startsWith('http')) window.location.href = redirect;
        else router.push('/dashboard');
      }, 1200);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await fetch('/api/auth/send-email-verification', {
        method: 'POST', credentials: 'include',
      });
      setCountdown(60);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card animate-fade-in" style={{ textAlign: 'center' }}>
        <div className="auth-logo">
          <img src="/logo.png" alt="iGlobals" style={{ height: 40 }} />
        </div>

        <div style={{ width: 56, height: 56, background: 'var(--color-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Mail size={24} color="var(--color-primary)" />
        </div>

        <h1 className="auth-title">Check your inbox</h1>
        <p className="auth-subtitle">We sent a 6-digit code to your email address.</p>

        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="status">
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
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
              onChange={e => handleInput(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              disabled={loading || !!success}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button
            id="btn-verify-email"
            className="btn btn-primary"
            onClick={() => handleVerify()}
            disabled={loading || otp.join('').length !== 6 || !!success}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Verifying…' : 'Verify email'}
          </button>

          <button
            id="btn-resend-email"
            className="btn btn-ghost"
            onClick={handleResend}
            disabled={resending || countdown > 0}
          >
            {resending ? <span className="spinner spinner-primary" /> : <RefreshCw size={16} />}
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
}
