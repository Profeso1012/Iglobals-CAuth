'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, Footer, IGlobalsLogo, InputField, GoogleAuthButton } from '@/components/GoogleAuthUI';

export default function LoginPage() {
    const router = useRouter();
    const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') setSearchParams(new URLSearchParams(window.location.search));
    }, []);

    const [step, setStep] = useState<'email' | 'password'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const oauthContext = searchParams?.get('client_id') ? {
        client_id: searchParams.get('client_id'),
        redirect_uri: searchParams.get('redirect_uri'),
        state: searchParams.get('state'),
        code_challenge: searchParams.get('code_challenge'),
        scopes: searchParams.get('scope')?.split(' '),
    } : undefined;

    const handleNext = () => {
        if (!email.trim()) {
            setError('Enter a valid email address');
            return;
        }
        setError('');
        setStep('password');
    };

    const handleBack = () => {
        setError('');
        setStep('email');
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
                const map: Record<string, string> = {
                    invalid_credentials: 'Wrong email or password. Please try again.',
                    no_password_set: 'This account uses Google Sign-In. Please use "Continue with Google" button or sign in with Google first to set a password.',
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
    };

    const handleCreateAccount = () => {
        const qs = searchParams?.toString();
        router.push(`/register${qs ? '?' + qs : ''}`);
    };

    /* ---- Email step ---- */
    if (step === 'email') {
        return (
            <div className="auth-screen">
                <div className="auth-card">
                    <div className="auth-card-grid">
                        {/* Left */}
                        <div className="auth-left">
                            <IGlobalsLogo />
                            <h1 className="auth-title">Sign in to iGlobals</h1>
                            <p className="auth-subtitle">Use your I-con Account</p>
                            <GoogleAuthButton className="desktop-only-btn" oauthContext={oauthContext} />
                        </div>

                        {/* Right */}
                        <div className="auth-right">
                            <InputField
                                label="Email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                error={error}
                                autoFocus
                            />

                            <a href="/forgot-password" className="auth-link">Forgot email?</a>

                            <div className="mobile-only-btn" style={{ marginTop: '16px', marginBottom: '8px' }}>
                                <GoogleAuthButton oauthContext={oauthContext} />
                            </div>

                            <div className="auth-actions">
                                <button type="button" onClick={handleCreateAccount} className="auth-btn-ghost">
                                    Create account
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleNext} 
                                    className="auth-btn-primary"
                                    disabled={!email.trim()}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    /* ---- Password step ---- */
    return (
        <div className="auth-screen">
            <BackButton onClick={handleBack} />
            <div className="auth-card">
                <div className="auth-card-grid">
                    {/* Left */}
                    <div className="auth-left">
                        <IGlobalsLogo />
                        <h1 className="auth-title">Welcome</h1>
                        <div className="auth-email-chip">
                            <div className="auth-email-chip-avatar">
                                {email.charAt(0).toUpperCase()}
                            </div>
                            <span className="auth-email-chip-text">{email}</span>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="auth-right">
                        <InputField
                            label="Enter your password"
                            type="password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            error={error}
                            autoFocus
                        />

                        <div className="auth-actions">
                            <a href="/forgot-password" className="auth-btn-ghost">
                                Forgot password?
                            </a>
                            <button
                                type="button"
                                onClick={handleLogin}
                                disabled={loading}
                                className="auth-btn-primary"
                            >
                                {loading ? 'Signing in…' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
