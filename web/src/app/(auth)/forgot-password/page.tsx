'use client';

import { useState, FormEvent } from 'react';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { Footer, IGlobalsLogo } from '@/components/GoogleAuthUI';

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
      
      if (!res.ok) { 
        const d = await res.json(); 
        
        // Special handling for Google users
        if (d.error === 'no_password_set') {
          setError(d.error_description || 'This account uses Google Sign-In. Please sign in with Google instead.');
        } else {
          setError(d.error_description || 'Failed to send reset link.');
        }
        return; 
      }
      
      setSent(true);
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
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">Enter your email to receive a reset link.</p>
          </div>

          {/* Right */}
          <div className="auth-right">
            {sent ? (
              <div className="alert alert-success">
                <CheckCircle size={16} />
                <span>If an account exists for that email, a reset link has been sent.</span>
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
                    <div className={`auth-field-inner ${email ? 'has-value' : ''}`}>
                      <label className="auth-field-label">Email</label>
                      <input
                        id="forgot-email"
                        type="email"
                        className="auth-field-input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="auth-actions-end">
                    <button
                      id="btn-forgot-password"
                      type="submit"
                      className="auth-btn-primary"
                      disabled={loading || !email}
                    >
                      {loading ? 'Sending…' : 'Send reset link'}
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
