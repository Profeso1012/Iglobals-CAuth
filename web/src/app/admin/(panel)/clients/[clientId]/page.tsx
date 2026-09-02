'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, X, Save, RefreshCw, AlertCircle, CheckCircle, Grid3x3, Users, KeyRound, Webhook } from 'lucide-react';
import { SecretModal, ToggleSwitch, ConfirmModal } from '@/components/AdminUI';

const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

interface Client {
  id: string; client_id: string; name: string; description: string | null;
  logo_url: string | null; redirect_uris: string[]; allowed_scopes: string[];
  is_active: boolean; created_at: string; updated_at: string;
}

interface Usage { active_consents: number; token_exchanges_30d: number; }

export default function AdminClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = params.clientId;

  const [client, setClient] = useState<Client | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [redirectUris, setRedirectUris] = useState<string[]>([]);
  const [uriInput, setUriInput] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const [webhookConfig, setWebhookConfig] = useState<{ webhook_url: string } | null>(null);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState('');
  const [webhookSuccess, setWebhookSuccess] = useState('');
  const [showRotateRelayConfirm, setShowRotateRelayConfirm] = useState(false);
  const [rotatingRelay, setRotatingRelay] = useState(false);
  const [newRelaySecret, setNewRelaySecret] = useState<string | null>(null);

  function loadWebhookConfig() {
    fetch(`/api/admin/clients/${clientId}/webhooks`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setWebhookConfig(d.config || null);
        setWebhookUrlInput(d.config?.webhook_url || '');
      })
      .catch(() => {});
  }

  useEffect(() => { loadWebhookConfig(); }, [clientId]);

  async function handleSaveWebhook() {
    setSavingWebhook(true); setWebhookError(''); setWebhookSuccess('');
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/webhooks`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrlInput }),
      });
      const data = await res.json();
      if (!res.ok) { setWebhookError(data.error_description || 'Failed to save.'); return; }
      setWebhookConfig(data.config);
      if (data.relay_secret) setNewRelaySecret(data.relay_secret);
      setWebhookSuccess('Webhook saved.');
      setTimeout(() => setWebhookSuccess(''), 3000);
    } catch { setWebhookError('Network error. Try again.'); }
    finally { setSavingWebhook(false); }
  }

  async function handleRotateRelaySecret() {
    setRotatingRelay(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/webhooks/rotate-secret`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) { setNewRelaySecret(data.relay_secret); setShowRotateRelayConfirm(false); }
    } finally { setRotatingRelay(false); }
  }

  function load() {
    setLoadError('');
    fetch(`/api/admin/clients/${clientId}`, { credentials: 'include' })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.client) {
          throw new Error(d.error_description || d.error || `Request failed (${r.status})`);
        }
        setClient(d.client);
        setUsage(d.usage);
        setName(d.client.name);
        setDescription(d.client.description || '');
        setLogoUrl(d.client.logo_url || '');
        setRedirectUris(d.client.redirect_uris || []);
        setScopes(d.client.allowed_scopes || []);
        setIsActive(d.client.is_active);
      })
      .catch(err => setLoadError(err.message || 'Failed to load client.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [clientId]);

  function addUri() {
    const v = uriInput.trim();
    if (!v) return;
    if (!redirectUris.includes(v)) setRedirectUris(u => [...u, v]);
    setUriInput('');
  }

  function toggleScope(scope: string) {
    setScopes(s => s.includes(scope) ? s.filter(x => x !== scope) : [...s, scope]);
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description: description || null, logo_url: logoUrl || null,
          redirect_uris: redirectUris, allowed_scopes: scopes, is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error_description || 'Failed to save.'); return; }
      setClient(data.client);
      setSuccess('Client updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Network error. Try again.'); }
    finally { setSaving(false); }
  }

  async function handleRotate() {
    setRotating(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/rotate-secret`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) { setNewSecret(data.client_secret); setShowRotateConfirm(false); }
    } finally { setRotating(false); }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-primary" style={{ width: 32, height: 32 }} /></div>;
  if (!client) return <div className="alert alert-error">{loadError || 'Client not found.'}</div>;

  return (
    <>
      <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => router.push('/admin/clients')}>
        <ArrowLeft size={16} /> Back to clients
      </button>

      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {client.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logo_url} alt="" className="app-logo" style={{ width: 48, height: 48 }} />
        ) : (
          <div className="app-logo-placeholder" style={{ width: 48, height: 48 }}><Grid3x3 size={22} /></div>
        )}
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-desc"><code>{client.client_id}</code></p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="stat-tile">
          <div className="stat-tile-label"><Users size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Active users</div>
          <div className="stat-tile-value">{usage?.active_consents ?? 0}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label"><RefreshCw size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Token exchanges (30d)</div>
          <div className="stat-tile-value">{usage?.token_exchanges_30d ?? 0}</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header"><span className="section-title">Details</span></div>
        <div className="section-body">
          {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}
          {success && <div className="alert alert-success"><CheckCircle size={16} /><span>{success}</span></div>}

          <div className="toggle-row">
            <div>
              <div className="toggle-row-label">Active</div>
              <div className="toggle-row-desc">Inactive clients cannot complete OAuth flows.</div>
            </div>
            <ToggleSwitch checked={isActive} onChange={setIsActive} disabled={saving} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-client-name">Display name</label>
            <input id="edit-client-name" className="form-input form-input-no-icon" value={name} onChange={e => setName(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-client-desc">Description</label>
            <input id="edit-client-desc" className="form-input form-input-no-icon" value={description} onChange={e => setDescription(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-client-logo">Logo URL</label>
            <input id="edit-client-logo" className="form-input form-input-no-icon" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-client-uri">Redirect URIs</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="edit-client-uri" className="form-input form-input-no-icon" placeholder="https://myapp.com/callback"
                value={uriInput} onChange={e => setUriInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUri(); } }}
                disabled={saving} />
              <button type="button" className="btn btn-ghost" onClick={addUri} disabled={saving}>Add</button>
            </div>
            <div className="chip-list">
              {redirectUris.map(uri => (
                <span className="chip" key={uri}>
                  <span>{uri}</span>
                  <button type="button" className="chip-remove" onClick={() => setRedirectUris(u => u.filter(x => x !== uri))} aria-label="Remove"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Allowed scopes</label>
            <div className="chip-list">
              {DEFAULT_SCOPES.map(scope => (
                <label key={scope} className="chip" style={{ cursor: 'pointer', background: scopes.includes(scope) ? 'var(--color-primary-light)' : 'var(--color-surface-2)' }}>
                  <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} style={{ margin: 0 }} />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowRotateConfirm(true)} disabled={saving}>
              <KeyRound size={16} /> Rotate secret
            </button>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header"><span className="section-title"><Webhook size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Payment webhooks</span></div>
        <div className="section-body">
          <p className="page-desc" style={{ marginTop: 0 }}>
            Paystack events for this client are relayed here by ICA (one shared Paystack account across all client apps) -
            this app never talks to Paystack&apos;s webhook directly. Point this at your own endpoint that verifies the
            <code> x-ica-relay-signature</code> header using the relay secret below.
          </p>
          {webhookError && <div className="alert alert-error"><AlertCircle size={16} /><span>{webhookError}</span></div>}
          {webhookSuccess && <div className="alert alert-success"><CheckCircle size={16} /><span>{webhookSuccess}</span></div>}

          <div className="form-group">
            <label className="form-label" htmlFor="webhook-url">Your app&apos;s webhook URL</label>
            <input id="webhook-url" className="form-input form-input-no-icon" placeholder="https://myapp.com/api/webhooks/ica-relay/paystack"
              value={webhookUrlInput} onChange={e => setWebhookUrlInput(e.target.value)} disabled={savingWebhook} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSaveWebhook} disabled={savingWebhook || !webhookUrlInput}>
              {savingWebhook ? <span className="spinner" /> : <Save size={16} />}
              {savingWebhook ? 'Saving…' : 'Save webhook URL'}
            </button>
            {webhookConfig && (
              <button className="btn btn-ghost" onClick={() => setShowRotateRelayConfirm(true)} disabled={savingWebhook}>
                <KeyRound size={16} /> Rotate relay secret
              </button>
            )}
          </div>
        </div>
      </div>

      {showRotateConfirm && (
        <ConfirmModal
          title="Rotate client secret"
          description="This immediately invalidates the current secret. Any running instance of this app using the old secret will fail to exchange tokens until updated."
          confirmLabel="Rotate secret"
          danger
          loading={rotating}
          onConfirm={handleRotate}
          onCancel={() => setShowRotateConfirm(false)}
        />
      )}

      {newSecret && (
        <SecretModal title="Secret rotated" secret={newSecret} onClose={() => setNewSecret(null)} />
      )}

      {showRotateRelayConfirm && (
        <ConfirmModal
          title="Rotate webhook relay secret"
          description="This immediately invalidates the current relay secret. This app's webhook endpoint will fail signature verification on new events until it's updated with the new secret."
          confirmLabel="Rotate secret"
          danger
          loading={rotatingRelay}
          onConfirm={handleRotateRelaySecret}
          onCancel={() => setShowRotateRelayConfirm(false)}
        />
      )}

      {newRelaySecret && (
        <SecretModal title="Webhook relay secret" secret={newRelaySecret} onClose={() => setNewRelaySecret(null)} />
      )}
    </>
  );
}
