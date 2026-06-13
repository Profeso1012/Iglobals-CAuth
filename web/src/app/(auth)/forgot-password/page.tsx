'use client';

import { useState, FormEvent } from 'react';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error_description || 'Failed.'); return; }
      setSent(true);
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="card animate-fade-in">
      <div className="auth-logo"><img src="/logo.png" alt="iGlobals" style={{ height: 40 }} /></div>
      <h1 className="auth-title">Reset password</h1>
      <p className="auth-subtitle">Enter your email to receive a reset link.</p>

      {sent ? (
        <div className="alert alert-success">
          <CheckCircle size={16} />
          <span>If an account exists for that email, a reset link has been sent.</span>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Email</label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={16} /></span>
                <input id="forgot-email" type="email" className="form-input"
                  placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} disabled={loading} />
              </div>
            </div>
            <button id="btn-forgot-password" type="submit" className="btn btn-primary btn-full" disabled={loading || !email}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Sending…' : 'Send reset link'}
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
