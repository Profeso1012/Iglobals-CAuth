'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckIcon, Footer, IGlobalsLogo } from '@/components/GoogleAuthUI';

const SCOPE_LABELS: Record<string, { label: string; desc: string }> = {
    openid:  { label: 'Identity',       desc: 'Your unique iGlobals user ID' },
    profile: { label: 'Profile',        desc: 'Name and basic profile information' },
    email:   { label: 'Email address',  desc: 'Your verified email address' },
    phone:   { label: 'Phone number',   desc: 'Your verified phone number' },
    address: { label: 'Address',        desc: 'Your registered address details' },
};

export default function ConsentPage() {
    const params = useSearchParams();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deciding, setDeciding] = useState(false);
    const [error, setError] = useState('');

    const clientId = params.get('client_id') || '';
    const redirectUri = params.get('redirect_uri') || '';
    const state = params.get('state') || '';
    const codeChallenge = params.get('code_challenge') || '';
    const scopes = (params.get('scope') || 'openid').split(' ');

    useEffect(() => {
        setClient({ client_id: clientId, name: clientId, logo_url: null, redirect_uris: [redirectUri] });
        setLoading(false);
    }, [clientId]);

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
        <div className="min-h-screen flex items-center justify-center bg-google-lightBg dark:bg-google-darkBg">
            <span className="spinner spinner-primary" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-google-lightBg dark:bg-google-darkBg text-google-textLight dark:text-google-textDark font-sans">
            <div className="w-full max-w-[500px] bg-white dark:bg-google-darkCard rounded-2xl shadow-lg p-8 relative z-10">
                <div className="flex flex-col items-center text-center mb-6">
                    {client?.logo_url ? (
                        <img src={client.logo_url} alt={client.name} className="w-16 h-16 rounded-xl border border-google-borderLight dark:border-google-borderDark mb-4" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl border border-google-borderLight dark:border-google-borderDark flex items-center justify-center mb-4 bg-google-lightBg dark:bg-[#202124]">
                            <span className="text-2xl font-bold">{client?.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                    )}
                    <h1 className="text-xl md:text-2xl font-normal mb-1">{client?.name || clientId}</h1>
                    <p className="text-sm">wants to access your I-con Account</p>
                </div>

                <div className="border border-google-borderLight dark:border-google-borderDark rounded-xl overflow-hidden mb-6">
                    <div className="bg-google-lightBg dark:bg-[#202124] px-4 py-3 border-b border-google-borderLight dark:border-google-borderDark flex items-center gap-3">
                        <IGlobalsLogo className="w-6 h-6 object-contain" />
                        <span className="font-medium text-sm">iGlobals</span>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-sm font-medium mb-3">This will allow {client?.name} to:</p>
                        <ul className="space-y-3">
                            {scopes.map((scope) => (
                                <li key={scope} className="flex items-start gap-3">
                                    <CheckIcon className="w-5 h-5 text-google-blue dark:text-google-link flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm">{SCOPE_LABELS[scope]?.label || scope}</p>
                                    </div>
                                </li>
                            ))}
                            {!scopes.includes('openid') && (
                                <li className="flex items-start gap-3">
                                    <CheckIcon className="w-5 h-5 text-google-blue dark:text-google-link flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm">{SCOPE_LABELS['openid']?.label}</p>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

                <p className="text-xs text-center mb-6">
                    Make sure you trust {client?.name}. You may be sharing sensitive info with this site or app. You can always see or remove access in your I-con Account.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-end gap-3">
                    <button type="button" onClick={() => handleDecision('deny')} disabled={deciding} className="w-full md:w-auto text-google-blue dark:text-google-link font-medium hover:bg-blue-50 dark:hover:bg-white/5 px-6 py-2.5 rounded-full transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="button" onClick={() => handleDecision('allow')} disabled={deciding} className="w-full md:w-auto bg-google-blue hover:bg-google-blueHover text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-sm disabled:opacity-50">
                        {deciding ? 'Processing...' : 'Allow'}
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
