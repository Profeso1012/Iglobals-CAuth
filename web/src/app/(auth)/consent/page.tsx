'use client';

import { useState, useEffect } from 'react';
import { IGlobalsLogo } from '@/components/PenpotAuth';

function ShieldCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

const SCOPE_LABELS: Record<string, { label: string; desc: string }> = {
  openid:  { label: 'Identity',      desc: 'Know who you are on iGlobals' },
  profile: { label: 'Profile',       desc: 'See your name and basic profile info' },
  email:   { label: 'Email address', desc: 'See your primary email address' },
  phone:   { label: 'Phone number',  desc: 'See your verified phone number' },
  address: { label: 'Address',       desc: 'See your registered address details' },
};

export default function ConsentPage() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [client, setClient]             = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [deciding, setDeciding]         = useState(false);
  const [error, setError]               = useState('');
  const [logoError, setLogoError]       = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined')
      setSearchParams(new URLSearchParams(window.location.search));
  }, []);

  const clientId      = searchParams?.get('client_id')      ?? '';
  const redirectUri   = searchParams?.get('redirect_uri')   ?? '';
  const state         = searchParams?.get('state')          ?? '';
  const codeChallenge = searchParams?.get('code_challenge') ?? '';
  const scopes        = (searchParams?.get('scope') ?? 'openid').split(' ');
  const displayScopes = scopes.includes('openid') ? scopes : ['openid', ...scopes];

  useEffect(() => {
    if (!searchParams || !clientId) return;
    (async () => {
      try {
        console.log('[Consent] Fetching client info for:', clientId);
        const res  = await fetch(`/api/oauth/clients/${clientId}`);
        const data = await res.json();
        console.log('[Consent] API response:', res.status, data);
        
        if (res.ok) {
          console.log('[Consent] Client data received:', data);
          setClient(data);
        } else {
          console.warn('[Consent] API error, using fallback:', data);
          setClient({ client_id: clientId, name: clientId, logo_url: null });
        }
      } catch (err) {
        console.error('[Consent] Fetch error:', err);
        setClient({ client_id: clientId, name: clientId, logo_url: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, clientId]);

  async function handleDecision(decision: 'allow' | 'deny') {
    setDeciding(true); setError('');
    try {
      const res  = await fetch('/api/oauth/consent', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri,
          state, code_challenge: codeChallenge, scopes, decision }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error_description || 'Failed to process consent.'); return; }
      if (data.redirect_to?.startsWith('http')) window.location.href = data.redirect_to;
    } catch {
      setError('Network error. Try again.');
    } finally {
      setDeciding(false);
    }
  }

  /* Loading */
  if (loading) return (
    <div className="cs-spinner-wrap">
      <div className="cs-spinner" />
    </div>
  );

  const appInitial = (client?.name?.charAt(0) ?? '?').toUpperCase();
  const showLogo = client?.logo_url && !logoError;

  return (
    <>
      <IGlobalsLogo />
      
      <div className="auth-container">
        <div className="auth-centered" style={{ maxWidth: '540px' }}>
          
          {/* App logo or initial */}
          {showLogo ? (
            <img 
              src={client.logo_url} 
              alt={client.name} 
              className="cs-app-logo"
              onError={() => {
                console.error('[Consent] Logo failed to load:', client.logo_url);
                setLogoError(true);
              }}
              onLoad={() => console.log('[Consent] Logo loaded successfully')}
            />
          ) : (
            <div className="cs-app-initial">{appInitial}</div>
          )}

          {/* App name */}
          <h1 className="cs-app-name">{client?.name ?? clientId}</h1>

          {/* Signed-in account chip */}
          <div className="cs-chip">
            <div className="cs-chip-avatar">U</div>
            <span className="cs-chip-text">user@iglobals.com</span>
          </div>

          {/* Access line */}
          <p className="cs-access-line">
            <strong>{client?.name}</strong> wants to access your I-con Account
          </p>

          {/* Scopes */}
          <ul className="cs-scopes">
            {displayScopes.map(scope => {
              const info = SCOPE_LABELS[scope] ?? { label: scope, desc: '' };
              return (
                <li key={scope} className="cs-scope-item">
                  <span className="cs-scope-icon"><ShieldCheckIcon /></span>
                  <div>
                    <p className="cs-scope-label">{info.label}</p>
                    {info.desc && <p className="cs-scope-desc">{info.desc}</p>}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Hint */}
          <p className="cs-hint">
            Make sure you trust <strong>{client?.name}</strong>. You may be sharing
            sensitive info with this site or app. You can always see or remove access
            in your <a href="/apps" className="cs-link">I-con Account</a>.
          </p>

          {error && <p className="auth-alert auth-alert-error">{error}</p>}

          {/* Actions */}
          <div className="cs-actions">
            <button type="button" className="cs-btn-ghost"
              onClick={() => handleDecision('deny')} disabled={deciding}>
              Cancel
            </button>
            <button type="button" className="cs-btn-primary"
              onClick={() => handleDecision('allow')} disabled={deciding}>
              {deciding ? 'Processing…' : 'Allow'}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}