'use client';

import { useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Footer, IGlobalsLogo, InputField } from '@/components/GoogleAuthUI';

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
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card-grid">
          {/* Left */}
          <div className="auth-left">
            <IGlobalsLogo />
            <h1 className="auth-title">New password</h1>
            <p className="auth-subtitle">Choose a strong password for your I-con account.</p>
          </div>

          {/* Right */}
          <div className="auth-right">
            {success ? (
              <div className="alert alert-success">
                <CheckCircle size={16} />
                <span>Password reset successfully! Redirecting to sign in…</span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="alert alert-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="auth-field">
                    <div className={`auth-field-inner ${password ? 'has-value' : ''}`}>
                      <label className="auth-field-label">New password</label>
                      <input
                        id="new-password"
                        type={showPwd ? 'text' : 'password'}
                        className="auth-field-input"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="auth-field-toggle"
                        onClick={() => setShowPwd(p => !p)}
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="auth-field-error" style={{ fontSize: '12px', color: 'var(--auth-text-muted)', marginTop: '4px' }}>
                      Min. 8 characters
                    </p>
                  </div>

                  <div className="auth-field">
                    <div className={`auth-field-inner ${confirm ? 'has-value' : ''}`}>
                      <label className="auth-field-label">Confirm password</label>
                      <input
                        id="new-confirm"
                        type={showPwd ? 'text' : 'password'}
                        className="auth-field-input"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="auth-actions-end">
                    <button
                      id="btn-reset-password"
                      type="submit"
                      className="auth-btn-primary"
                      disabled={loading || !password || !confirm || !token}
                    >
                      {loading ? 'Resetting…' : 'Reset password'}
                    </button>
                  </div>
                </form>

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
                  <a href="/login" className="auth-link">Back to sign in</a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
