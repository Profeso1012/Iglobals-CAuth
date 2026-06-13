'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const oauthContext = params.get('client_id') ? {
    client_id: params.get('client_id'),
    redirect_uri: params.get('redirect_uri'),
    state: params.get('state'),
    code_challenge: params.get('code_challenge'),
    scopes: params.get('scope')?.split(' '),
  } : undefined;

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required.';
    if (!form.email.includes('@')) errs.email = 'Enter a valid email address.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.';
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setGlobalError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || undefined,
          oauth_context: oauthContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fields) { setErrors(data.fields); return; }
        const map: Record<string, string> = {
          email_taken: 'An account with this email already exists.',
        };
        setGlobalError(map[data.error] || data.error_description || 'Registration failed.');
        return;
      }

      // After registration, go to email verification before proceeding
      if (data.redirect_to?.startsWith('http')) {
        // Store the redirect for after verification
        sessionStorage.setItem('post_verify_redirect', data.redirect_to);
      }
      router.push('/verify-email');
    } catch {
      setGlobalError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card-wide animate-fade-in">
      <div className="auth-logo">
        <img src="/logo.png" alt="iGlobals" style={{ height: 40 }} />
      </div>

      <h1 className="auth-title">Become an I-con</h1>
      <p className="auth-subtitle">Create your iGlobals identity</p>

      {globalError && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="first_name">First name</label>
            <div className="input-wrapper">
              <span className="input-icon"><User size={16} /></span>
              <input id="first_name" type="text"
                className={`form-input${errors.first_name ? ' error' : ''}`}
                placeholder="Profeso" value={form.first_name}
                onChange={e => set('first_name', e.target.value)} disabled={loading} />
            </div>
            {errors.first_name && <p className="field-error"><AlertCircle size={12} />{errors.first_name}</p>}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="last_name">Last name</label>
            <div className="input-wrapper">
              <span className="input-icon"><User size={16} /></span>
              <input id="last_name" type="text"
                className={`form-input${errors.last_name ? ' error' : ''}`}
                placeholder="Doe" value={form.last_name}
                onChange={e => set('last_name', e.target.value)} disabled={loading} />
            </div>
            {errors.last_name && <p className="field-error"><AlertCircle size={12} />{errors.last_name}</p>}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label" htmlFor="reg-email">Email</label>
          <div className="input-wrapper">
            <span className="input-icon"><Mail size={16} /></span>
            <input id="reg-email" type="email"
              className={`form-input${errors.email ? ' error' : ''}`}
              placeholder="you@example.com" value={form.email}
              onChange={e => set('email', e.target.value)}
              autoComplete="email" disabled={loading} />
          </div>
          {errors.email && <p className="field-error"><AlertCircle size={12} />{errors.email}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="phone">Phone <span style={{ color: 'var(--color-text-disabled)' }}>(optional)</span></label>
          <div className="input-wrapper">
            <span className="input-icon"><Phone size={16} /></span>
            <input id="phone" type="tel"
              className="form-input"
              placeholder="+2348012345678" value={form.phone}
              onChange={e => set('phone', e.target.value)} disabled={loading} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={16} /></span>
            <input id="reg-password" type={showPwd ? 'text' : 'password'}
              className={`form-input${errors.password ? ' error' : ''}`}
              placeholder="Min. 8 characters" value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete="new-password" disabled={loading} />
            <button type="button" className="input-action"
              onClick={() => setShowPwd(p => !p)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="field-error"><AlertCircle size={12} />{errors.password}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm">Confirm password</label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={16} /></span>
            <input id="confirm" type={showPwd ? 'text' : 'password'}
              className={`form-input${errors.confirm ? ' error' : ''}`}
              placeholder="••••••••" value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              autoComplete="new-password" disabled={loading} />
          </div>
          {errors.confirm && <p className="field-error"><AlertCircle size={12} />{errors.confirm}</p>}
        </div>

        <button id="btn-register" type="submit"
          className="btn btn-primary btn-full" disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Creating account…' : 'Create I-con account'}
        </button>
      </form>

      <div className="divider">or</div>

      <p style={{ textAlign: 'center', fontSize: 14 }}>
        Already an I-con?{' '}
        <Link href={`/login${params.toString() ? '?' + params.toString() : ''}`}>Sign in</Link>
      </p>
    </div>
  );
}
