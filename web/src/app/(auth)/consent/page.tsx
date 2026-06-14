'use client';

import { useState, useEffect } from 'react';
import { Footer, IGlobalsLogo } from '@/components/GoogleAuthUI';

const SCOPE_LABELS: Record<string, { label: string; desc: string }> = {
    openid:  { label: 'Identity',      desc: 'Know who you are on iGlobals' },
    profile: { label: 'Profile',       desc: 'See your name and basic profile info' },
    email:   { label: 'Email address', desc: 'See your primary email address' },
    phone:   { label: 'Phone number',  desc: 'See your verified phone number' },
    address: { label: 'Address',       desc: 'See your registered address details' },
};

function ShieldCheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
        </svg>
    );
}

export default function ConsentPage() {
    const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
    const [client, setClient]             = useState<any>(null);
    const [loading, setLoading]           = useState(true);
    const [deciding, setDeciding]         = useState(false);
    const [error, setError]               = useState('');

    const clientId      = searchParams?.get('client_id')      || '';
    const redirectUri   = searchParams?.get('redirect_uri')   || '';
    const state         = searchParams?.get('state')          || '';
    const codeChallenge = searchParams?.get('code_challenge') || '';
    const scopes        = (searchParams?.get('scope') || 'openid').split(' ');
    const displayScopes = scopes.includes('openid') ? scopes : ['openid', ...scopes];

    useEffect(() => {
        if (typeof window !== 'undefined')
            setSearchParams(new URLSearchParams(window.location.search));
    }, []);

    useEffect(() => {
        if (!searchParams || !clientId) return;
        
        // Fetch actual client data from database
        async function fetchClient() {
            try {
                const res = await fetch(`/api/oauth/clients/${clientId}`);
                if (!res.ok) {
                    throw new Error('Failed to fetch client info');
                }
                const data = await res.json();
                setClient(data);
            } catch (err) {
                console.error('Error fetching client:', err);
                // Fallback to basic client info
                setClient({ 
                    client_id: clientId, 
                    name: clientId, 
                    logo_url: null 
                });
            } finally {
                setLoading(false);
            }
        }
        
        fetchClient();
    }, [searchParams, clientId]);

    async function handleDecision(decision: 'allow' | 'deny') {
        setDeciding(true); setError('');
        try {
            const res = await fetch('/api/oauth/consent', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri, state, code_challenge: codeChallenge, scopes, decision }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error_description || 'Failed to process consent.'); return; }
            if (data.redirect_to?.startsWith('http')) window.location.href = data.redirect_to;
        } catch { setError('Network error. Try again.'); }
        finally { setDeciding(false); }
    }

    if (loading) return (
        <div className="auth-screen">
            <span className="spinner spinner-primary" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
    );

    const appInitial = (client?.name?.charAt(0) ?? '?').toUpperCase();

    return (
        <div className="auth-screen">
            <div className="auth-card auth-consent-card">

                {/* Header strip */}
                <div className="auth-consent-header">
                    <IGlobalsLogo className="auth-consent-header-logo" />
                    <span className="auth-consent-header-text">Sign in with iGlobals</span>
                </div>

                {/* Two-column body */}
                <div className="auth-card-grid auth-consent-grid">

                    {/* LEFT */}
                    <div className="auth-left auth-consent-left">
                        {client?.logo_url ? (
                            <img src={client.logo_url} alt={client.name} className="auth-consent-app-logo" />
                        ) : (
                            <div className="auth-consent-app-initial">
                                <span>{appInitial}</span>
                            </div>
                        )}
                        <h1 className="auth-title">{client?.name || clientId}</h1>
                        <div className="auth-email-chip">
                            <div className="auth-email-chip-avatar">U</div>
                            <span className="auth-email-chip-text">user@iglobals.com</span>
                        </div>
                    </div>

                    {/* Vertical divider */}
                    <div className="auth-consent-divider" />

                    {/* RIGHT */}
                    <div className="auth-right auth-consent-right">
                        <p className="auth-subtitle" style={{ marginBottom: 0 }}>
                            <strong>{client?.name}</strong> wants to access your I-con Account
                        </p>

                        <ul className="scope-list auth-consent-scope-list">
                            {displayScopes.map((scope) => {
                                const info = SCOPE_LABELS[scope] ?? { label: scope, desc: '' };
                                return (
                                    <li key={scope} className="scope-item">
                                        <span className="scope-icon"><ShieldCheckIcon /></span>
                                        <div>
                                            <p className="auth-consent-scope-label">{info.label}</p>
                                            {info.desc && <p className="scope-desc">{info.desc}</p>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <p className="auth-hint">
                            Make sure you trust <strong>{client?.name}</strong>. You may be sharing
                            sensitive info with this site or app. You can always see or remove access
                            in your <a href="#" className="auth-link">I-con Account</a>.
                        </p>

                        {error && <p className="auth-error-msg">{error}</p>}

                        <div className="auth-actions">
                            <button type="button" onClick={() => handleDecision('deny')}
                                disabled={deciding} className="auth-btn-ghost">
                                Cancel
                            </button>
                            <button type="button" onClick={() => handleDecision('allow')}
                                disabled={deciding} className="auth-btn-primary">
                                {deciding ? 'Processing…' : 'Allow'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
