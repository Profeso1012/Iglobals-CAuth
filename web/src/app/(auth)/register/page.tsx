'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackButton, Footer, IGlobalsLogo, InputField } from '@/components/GoogleAuthUI';

type RegisterStep = 'name' | 'emailPhone' | 'password';

export default function RegisterPage() {
    const router = useRouter();
    const params = useSearchParams();

    const [step, setStep] = useState<RegisterStep>('name');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const oauthContext = params.get('client_id') ? {
        client_id: params.get('client_id'),
        redirect_uri: params.get('redirect_uri'),
        state: params.get('state'),
        code_challenge: params.get('code_challenge'),
        scopes: params.get('scope')?.split(' '),
    } : undefined;

    const handleNextName = () => {
        if (!firstName.trim() || !lastName.trim()) {
            setError('First name and last name are required');
            return;
        }
        setError('');
        setStep('emailPhone');
    };

    const handleNextEmail = () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Enter a valid email address');
            return;
        }
        setError('');
        setStep('password');
    };

    const handleBackToLogin = () => {
        router.push(`/login${params.toString() ? '?' + params.toString() : ''}`);
    };

    const handleRegister = async () => {
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

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
                    phone: phone || undefined,
                    oauth_context: oauthContext,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.fields) {
                    setError(Object.values(data.fields)[0] as string);
                    return;
                }
                const map: Record<string, string> = {
                    email_taken: 'An account with this email already exists.',
                };
                setError(map[data.error] || data.error_description || 'Registration failed.');
                return;
            }

            if (data.redirect_to?.startsWith('http')) {
                sessionStorage.setItem('post_verify_redirect', data.redirect_to);
            }
            router.push('/verify-email');
        } catch {
            setError('Network error. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            {/* Step: Name */}
            {step === 'name' && (
                <>
                    <BackButton onClick={handleBackToLogin} />
                    <div className="auth-card">
                        <div className="auth-card-grid">
                            <div className="auth-left">
                                <IGlobalsLogo />
                                <h1 className="auth-title">Create an I-con account</h1>
                                <p className="auth-subtitle">Enter your name</p>
                            </div>
                            <div className="auth-right">
                                <InputField
                                    label="First name"
                                    value={firstName}
                                    onChange={e => { setFirstName(e.target.value); setError(''); }}
                                    autoFocus
                                />
                                <InputField
                                    label="Last name"
                                    value={lastName}
                                    onChange={e => { setLastName(e.target.value); setError(''); }}
                                />
                                {error && <p className="auth-error-msg">{error}</p>}
                                <div className="auth-actions-end">
                                    <button type="button" onClick={handleNextName} className="auth-btn-primary">
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Step: Email & Phone */}
            {step === 'emailPhone' && (
                <>
                    <BackButton onClick={() => setStep('name')} />
                    <div className="auth-card">
                        <div className="auth-card-grid">
                            <div className="auth-left">
                                <IGlobalsLogo />
                                <h1 className="auth-title">Basic information</h1>
                                <p className="auth-subtitle">Enter your email and optional phone number</p>
                            </div>
                            <div className="auth-right">
                                <InputField
                                    label="Email address"
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    autoFocus
                                />
                                <InputField
                                    label="Phone number (optional)"
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                />
                                {error && <p className="auth-error-msg">{error}</p>}
                                <div className="auth-actions-end">
                                    <button type="button" onClick={handleNextEmail} className="auth-btn-primary">
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Step: Password */}
            {step === 'password' && (
                <>
                    <BackButton onClick={() => setStep('emailPhone')} />
                    <div className="auth-card">
                        <div className="auth-card-grid">
                            <div className="auth-left">
                                <IGlobalsLogo />
                                <h1 className="auth-title">Create a strong password</h1>
                                <p className="auth-subtitle">Mix of letters, numbers and symbols</p>
                            </div>
                            <div className="auth-right">
                                <InputField
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    autoFocus
                                />
                                <InputField
                                    label="Confirm password"
                                    type="password"
                                    value={confirm}
                                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                                />
                                {error && <p className="auth-error-msg">{error}</p>}
                                <div className="auth-actions-end">
                                    <button
                                        type="button"
                                        onClick={handleRegister}
                                        disabled={loading}
                                        className="auth-btn-primary"
                                    >
                                        {loading ? 'Creating…' : 'Create Account'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Footer />
        </div>
    );
}
