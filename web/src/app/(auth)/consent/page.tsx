'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Check, X, AlertCircle } from 'lucide-react';

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
    // In real implementation, fetch client details from a public /api/oauth/client/:id endpoint
    // For now, we rely on the params having what we need
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
    <div className="card animate-fade-in" style={{ textAlign: 'center' }}>
      <span className="spinner spinner-primary" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="card card-wide animate-fade-in">
      <div className="consent-app-header">
        {client?.logo_url
          ? <img src={client.logo_url} alt={client.name} className="consent-app-logo" />
          : (
            <div style={{ width: 72, height: 72, background: 'var(--color-surface-2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={32} color="var(--color-text-secondary)" />
            </div>
          )
        }
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>wants access to your</p>
          <img src="/logo.png" alt="iGlobals" style={{ height: 28, margin: '4px auto 0' }} />
          <p style={{ fontWeight: 600, fontSize: 14 }}>I-con account</p>
        </div>
      </div>

      <h1 className="auth-title" style={{ marginBottom: 4 }}>{client?.name || clientId}</h1>
      <p className="auth-subtitle">is requesting access to the following:</p>

      {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}

      <ul className="scope-list">
        {scopes.filter(s => s !== 'openid').map(scope => (
          <li key={scope} className="scope-item">
            <span className="scope-icon"><Check size={14} /></span>
            <div>
              <strong>{SCOPE_LABELS[scope]?.label || scope}</strong>
              <span className="scope-desc"> — {SCOPE_LABELS[scope]?.desc || scope}</span>
            </div>
          </li>
        ))}
        <li className="scope-item">
          <span className="scope-icon"><Check size={14} /></span>
          <div>
            <strong>{SCOPE_LABELS.openid.label}</strong>
            <span className="scope-desc"> — {SCOPE_LABELS.openid.desc}</span>
          </div>
        </li>
      </ul>

      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
        By allowing, you grant <strong>{client?.name || clientId}</strong> access to the above information.
        You can revoke this at any time from your I-con dashboard.
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button id="btn-deny-consent" className="btn btn-ghost btn-full" onClick={() => handleDecision('deny')} disabled={deciding}>
          <X size={16} /> Deny
        </button>
        <button id="btn-allow-consent" className="btn btn-primary btn-full" onClick={() => handleDecision('allow')} disabled={deciding}>
          {deciding ? <span className="spinner" /> : <Check size={16} />}
          {deciding ? 'Processing…' : 'Allow'}
        </button>
      </div>
    </div>
  );
}
