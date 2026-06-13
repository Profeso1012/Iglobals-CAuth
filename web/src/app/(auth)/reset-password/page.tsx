'use client';

import { useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!token) { setError('Invalid or missing reset token.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_token: 'This reset link is invalid or has expired.',
          token_used: 'This link has already been used.',
        };
        setError(map[data.error] || data.error_description || 'Reset failed.'); return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="card animate-fade-in">
      <div className="auth-logo"><img src="/logo.png" alt="iGlobals" style={{ height: 40 }} /></div>
      <h1 className="auth-title">New password</h1>
      <p className="auth-subtitle">Choose a strong password for your I-con account.</p>

      {success ? (
        <div className="alert alert-success">
          <CheckCircle size={16} />
          <span>Password reset successfully! Redirecting to sign in…</span>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New password</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={16} /></span>
                <input id="new-password" type={showPwd ? 'text' : 'password'} className="form-input"
                  placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password" disabled={loading} />
                <button type="button" className="input-action" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-confirm">Confirm password</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={16} /></span>
                <input id="new-confirm" type={showPwd ? 'text' : 'password'} className="form-input"
                  placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password" disabled={loading} />
              </div>
            </div>
            <button id="btn-reset-password" type="submit" className="btn btn-primary btn-full"
              disabled={loading || !password || !confirm || !token}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        </>
      )}
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
