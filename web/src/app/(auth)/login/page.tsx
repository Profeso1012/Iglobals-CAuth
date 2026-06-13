'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Collect OAuth context from URL params
  const oauthContext = params.get('client_id') ? {
    client_id: params.get('client_id'),
    redirect_uri: params.get('redirect_uri'),
    state: params.get('state'),
    code_challenge: params.get('code_challenge'),
    scopes: params.get('scope')?.split(' '),
  } : undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, remember_me: rememberMe, oauth_context: oauthContext }),
      });

      const data = await res.json();

      if (!res.ok) {
        const map: Record<string, string> = {
          invalid_credentials: 'Wrong email or password. Please try again.',
          account_disabled: 'Your account has been disabled. Contact support.',
          too_many_requests: 'Too many attempts. Try again in 15 minutes.',
        };
        setError(map[data.error] || data.error_description || 'Sign-in failed. Please try again.');
        return;
      }

      if (data.redirect_to?.startsWith('http')) {
        window.location.href = data.redirect_to;
      } else {
        router.push(data.redirect_to || '/dashboard');
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card animate-fade-in">
      <div className="auth-logo">
        <img src="/logo.png" alt="iGlobals" style={{ height: 40 }} />
      </div>

      <h1 className="auth-title">Sign in</h1>
      <p className="auth-subtitle">
        {oauthContext ? 'to continue to the requesting app' : 'to your iGlobals account'}
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <div className="input-wrapper">
            <span className="input-icon"><Mail size={16} /></span>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={16} /></span>
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPwd(p => !p)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              id="remember-me"
            />
            <span className="checkbox-label">Remember me</span>
          </label>
          <Link href="/forgot-password" style={{ fontSize: 14 }}>Forgot password?</Link>
        </div>

        <button
          id="btn-login"
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || !email || !password}
        >
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="divider">or</div>

      <p style={{ textAlign: 'center', fontSize: 14 }}>
        New to iGlobals?{' '}
        <Link href={`/register${params.toString() ? '?' + params.toString() : ''}`}>
          Become an I-con
        </Link>
      </p>
    </div>
  );
}
