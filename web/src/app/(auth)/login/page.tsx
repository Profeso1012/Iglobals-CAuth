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
  AuthIllustration 
} from '@/components/PenpotAuth';

export default function LoginPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');

  const oauthContext = searchParams?.get('client_id') ? {
    client_id: searchParams.get('client_id'),
    redirect_uri: searchParams.get('redirect_uri'),
    state: searchParams.get('state'),
    code_challenge: searchParams.get('code_challenge'),
    scopes: searchParams.get('scope')?.split(' '),
  } : undefined;

  const handleNext = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleLogin = async () => {
    if (!password) {
      setError('Enter a password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, remember_me: true, oauth_context: oauthContext }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMap: Record<string, string> = {
          invalid_credentials: 'Wrong email or password. Please try again.',
          no_password_set: 'This account uses Google Sign-In. Use "Continue with Google" button.',
          account_disabled: 'Your account has been disabled. Contact support.',
          too_many_requests: 'Too many attempts. Try again in 15 minutes.',
        };
        setError(errorMap[data.error] || data.error_description || 'Sign-in failed. Please try again.');
        return;
      }

      if (data.redirect_to?.startsWith('http')) {
        window.location.href = data.redirect_to;
      } else {
        router.push(data.redirect_to || '/dashboard');
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <>
        <IGlobalsLogo />
        <AuthTabs 
          active="login" 
          onSwitch={(tab) => tab === 'register' && router.push(`/register${searchParams ? '?' + searchParams.toString() : ''}`)} 
        />

        <div className="auth-container">
          <div className="auth-split">
            {/* Left: Illustration */}
            <div className="auth-art">
              <AuthIllustration />
            </div>

            {/* Right: Form */}
            <div className="auth-form">
              <h1 className="auth-title">Log into my account</h1>
              <p className="auth-subtitle">iGlobals is your secure gateway to all services</p>

              <SocialButtons oauthContext={oauthContext} />
              
              <Divider text="or" />

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

              <div className="auth-text-right">
                <a href="/forgot-password" className="auth-link">Forgot password?</a>
              </div>

              <Button onClick={handleNext} disabled={!email.trim()}>
                Continue
              </Button>

              <p className="auth-text-center">
                No account yet? <a href="/register" className="auth-link">Create an account</a>
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Password step
  return (
    <>
      <IGlobalsLogo />

      <div className="auth-container">
        <div className="auth-split">
          <div className="auth-art">
            <AuthIllustration />
          </div>

          <div className="auth-form">
            <button 
              className="auth-back-btn"
              onClick={() => setStep('email')}
              aria-label="Go back"
            >
              Back
            </button>

            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">{email}</p>

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter your password"
              autoFocus
              name="current-password"
            />

            {error && <p className="auth-alert auth-alert-error">{error}</p>}

            <div className="auth-text-right">
              <a href="/forgot-password" className="auth-link">Forgot password?</a>
            </div>

            <Button onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
