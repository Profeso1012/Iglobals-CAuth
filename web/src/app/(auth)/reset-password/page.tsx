'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IGlobalsLogo, 
  InputField, 
  Button, 
  LockIcon 
} from '@/components/PenpotAuth';

export default function ResetPasswordPage() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const token = searchParams?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (password !== confirm) { 
      setError('Passwords do not match.'); 
      return; 
    }
    if (password.length < 8) { 
      setError('Password must be at least 8 characters.'); 
      return; 
    }
    if (!token) { 
      setError('Invalid or missing reset token.'); 
      return; 
    }
    
    setLoading(true); 
    setError('');
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const errorMap: Record<string, string> = {
          invalid_token: 'This reset link is invalid or has expired.',
          token_used: 'This link has already been used.',
        };
        setError(errorMap[data.error] || data.error_description || 'Reset failed.'); 
        return;
      }
      
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
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

          <h1 className="auth-title">Create new password</h1>
          <p className="auth-subtitle">Choose a strong password with a mix of letters, numbers and symbols.</p>

          {success ? (
            <div className="auth-alert auth-alert-success">
              <span>Password reset successfully! Redirecting to sign in…</span>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>
                <InputField
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="New password"
                  autoFocus
                  name="new-password"
                />

                <p className="auth-hint">At least 8 characters</p>

                <InputField
                  label="Confirm Password"
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Confirm password"
                  name="new-password"
                />

                {error && <p className="auth-alert auth-alert-error">{error}</p>}

                <Button type="submit" disabled={loading || !password || !confirm || !token}>
                  {loading ? 'Resetting…' : 'Reset password'}
                </Button>
              </form>

              <p className="auth-text-center">
                <a href="/login" className="auth-link">Back to sign in</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
