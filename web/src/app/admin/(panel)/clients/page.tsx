'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Plus, X, AlertCircle, Grid3x3 } from 'lucide-react';
import { SecretModal, ModalOverlay } from '@/components/AdminUI';

interface Client {
  id: string; client_id: string; name: string; description: string | null;
  logo_url: string | null; redirect_uris: string[]; allowed_scopes: string[];
  is_active: boolean; created_at: string;
}

const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{ client_id: string; secret: string } | null>(null);

  function load() {
    fetch('/api/admin/clients', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="page-header page-header-actions">
        <div>
          <h1 className="page-title">OAuth clients</h1>
          <p className="page-desc">Register and manage third-party applications.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create client
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-primary" style={{ width: 32, height: 32 }} /></div>
      ) : clients.length === 0 ? (
        <div className="empty-state">No OAuth clients yet. Create one to get started.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>App</th>
                <th>Client ID</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="clickable" onClick={() => window.location.assign(`/admin/clients/${c.client_id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {c.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logo_url} alt="" className="app-logo" />
                      ) : (
                        <div className="app-logo-placeholder"><Grid3x3 size={18} /></div>
                      )}
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td><code style={{ fontSize: 12 }}>{c.client_id}</code></td>
                  <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={(client_id, secret) => {
            setShowCreate(false);
            setCreatedSecret({ client_id, secret });
            load();
          }}
        />
      )}

      {createdSecret && (
        <SecretModal
          title="Client created"
          clientId={createdSecret.client_id}
          secret={createdSecret.secret}
          onClose={() => setCreatedSecret(null)}
        />
      )}
    </>
  );
}

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (clientId: string, secret: string) => void }) {
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [redirectUris, setRedirectUris] = useState<string[]>([]);
  const [uriInput, setUriInput] = useState('');
  const [scopes, setScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addUri() {
    const v = uriInput.trim();
    if (!v) return;
    if (!redirectUris.includes(v)) setRedirectUris(u => [...u, v]);
    setUriInput('');
  }

  function toggleScope(scope: string) {
    setScopes(s => s.includes(scope) ? s.filter(x => x !== scope) : [...s, scope]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!clientId.trim() || !name.trim() || redirectUris.length === 0) {
      setError('Client ID, name, and at least one redirect URI are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          logo_url: logoUrl.trim() || undefined,
          redirect_uris: redirectUris,
          allowed_scopes: scopes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error_description || 'Failed to create client.'); return; }
      onCreated(data.client.client_id, data.client_secret);
    } catch { setError('Network error. Try again.'); }
    finally { setSaving(false); }
  }

  return (
    <ModalOverlay onClose={onClose}>
        <div className="modal-header">
          <span className="section-title">Create OAuth client</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-client-id">Client ID</label>
            <input id="new-client-id" className="form-input form-input-no-icon" placeholder="my-awesome-app"
              value={clientId} onChange={e => setClientId(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-client-name">Display name</label>
            <input id="new-client-name" className="form-input form-input-no-icon" placeholder="My Awesome Application"
              value={name} onChange={e => setName(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-client-desc">Description (optional)</label>
            <input id="new-client-desc" className="form-input form-input-no-icon" placeholder="What this app is for"
              value={description} onChange={e => setDescription(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-client-logo">Logo URL (optional)</label>
            <input id="new-client-logo" className="form-input form-input-no-icon" placeholder="https://cdn.example.com/logo.png"
              value={logoUrl} onChange={e => setLogoUrl(e.target.value)} disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-client-uri">Redirect URIs</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="new-client-uri" className="form-input form-input-no-icon" placeholder="https://myapp.com/callback"
                value={uriInput}
                onChange={e => setUriInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUri(); } }}
                disabled={saving} />
              <button type="button" className="btn btn-ghost" onClick={addUri} disabled={saving}>Add</button>
            </div>
            {redirectUris.length > 0 && (
              <div className="chip-list">
                {redirectUris.map(uri => (
                  <span className="chip" key={uri}>
                    <span>{uri}</span>
                    <button type="button" className="chip-remove" onClick={() => setRedirectUris(u => u.filter(x => x !== uri))} aria-label="Remove"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
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
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={saving}>
            {saving ? <span className="spinner" /> : <Plus size={16} />}
            {saving ? 'Creating…' : 'Create client'}
          </button>
        </form>
    </ModalOverlay>
  );
}
