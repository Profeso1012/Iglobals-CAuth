'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IGlobalsLogo, 
  AuthTabs, 
  SocialButtons, 
  Divider, 
  InputField, 
  Button, 
  Checkbox
} from '@/components/PenpotAuth';

export default function RegisterPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const oauthContext = searchParams?.get('client_id') ? {
    client_id: searchParams.get('client_id'),
    redirect_uri: searchParams.get('redirect_uri'),
    state: searchParams.get('state'),
    code_challenge: searchParams.get('code_challenge'),
    scopes: searchParams.get('scope')?.split(' '),
  } : undefined;

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the terms of service');
      return;
    }

    setLoading(true);
    setError('');

    // Parse full name into first and last
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          oauth_context: oauthContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fields) {
          setError(Object.values(data.fields)[0] as string);
          return;
        }
        const errorMap: Record<string, string> = {
          email_taken: 'An account with this email already exists.',
        };
        setError(errorMap[data.error] || data.error_description || 'Registration failed.');
        return;
      }

      if (data.redirect_to?.startsWith('http')) {
        sessionStorage.setItem('post_verify_redirect', data.redirect_to);
      }
      router.push('/verify-email');
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IGlobalsLogo />
      <AuthTabs 
        active="register" 
        onSwitch={(tab) => tab === 'login' && router.push(`/login${searchParams ? '?' + searchParams.toString() : ''}`)} 
      />

      <div className="auth-container">
        <div className="auth-centered">
          <h1 className="auth-title">Create an account</h1>

          <SocialButtons oauthContext={oauthContext} />
          
          <Divider />

          <InputField
            label="Full Name"
            type="text"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setError(''); }}
            placeholder="Full Name"
            autoFocus
            name="name"
          />

          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="Email address"
            autoFocus
            name="email"
          />

          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Password"
            name="new-password"
          />

          <p className="auth-hint">At least 8 characters</p>

          <Checkbox checked={agreeTerms} onChange={setAgreeTerms}>
            I agree to the <a href="/terms" className="auth-link">terms of service</a> and <a href="/privacy" className="auth-link">privacy policy</a>.
          </Checkbox>

          {error && <p className="auth-alert auth-alert-error">{error}</p>}

          <Button onClick={handleRegister} disabled={loading}>
            {loading ? 'Creating…' : 'Create an account'}
          </Button>

          <p className="auth-text-center">
            Already have an account? <a href="/login" className="auth-link">Login here.</a>
          </p>
        </div>
      </div>
    </>
  );
}
