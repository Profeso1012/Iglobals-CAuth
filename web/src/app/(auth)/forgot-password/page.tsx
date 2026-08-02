'use client';

import { useState, FormEvent } from 'react';
import { 
  IGlobalsLogo, 
  InputField, 
  Button, 
  LockIcon 
} from '@/components/PenpotAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    
    setLoading(true); 
    setError('');
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', 
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!res.ok) { 
        const d = await res.json(); 
        
        if (d.error === 'no_password_set') {
          setError(d.error_description || 'This account uses Google Sign-In. Please sign in with Google instead.');
        } else {
          setError(d.error_description || 'Failed to send reset link.');
        }
        return; 
      }
      
      setSent(true);
    } catch { 
      setError('Network error. Try again.'); 
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <>
      <IGlobalsLogo />

      <div className="auth-container">
        <div className="auth-centered">
          <div className="auth-forgot-icon">
            <LockIcon />
          </div>

          <h1 className="auth-title">Forgot your password?</h1>
          <p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password.</p>

          {sent ? (
            <div className="auth-alert auth-alert-success">
              <span>If an account exists for that email, a reset link has been sent.</span>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>
                <InputField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="Email address"
                  autoFocus
                  name="email"
                />

                {error && <p className="auth-alert auth-alert-error">{error}</p>}

                <Button type="submit" disabled={loading || !email}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>

              <p className="auth-text-center">
                <a href="/login" className="auth-link">Back to log in</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
