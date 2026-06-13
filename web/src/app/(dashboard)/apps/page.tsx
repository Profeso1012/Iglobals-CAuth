'use client';

import { useState, useEffect } from 'react';
import { Grid3x3, Shield, Trash2, AlertCircle } from 'lucide-react';

export default function AppsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/apps', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setApps(data.apps || []); setLoading(false); });
  }, []);

  async function revokeApp(clientId: string) {
    setRevokingId(clientId);
    try {
      await fetch(`/api/auth/apps/${clientId}`, { method: 'DELETE', credentials: 'include' });
      setApps(a => a.filter(x => x.client_id !== clientId));
    } finally {
      setRevokingId(null);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Authorized apps</h1>
        <p className="page-desc">These apps have been granted access to your I-con account. You can revoke access at any time.</p>
      </div>

      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Connected apps</span>
          <span className="badge badge-gray">{apps.length}</span>
        </div>
        <div className="section-body">
          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="spinner spinner-primary" /></div>
            : apps.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
                  <Grid3x3 size={40} style={{ margin: '0 auto 12px', opacity: .4 }} />
                  <p style={{ fontSize: 14 }}>No apps have been authorized yet.</p>
                </div>
              )
              : apps.map(app => (
                <div key={app.client_id} className="app-card">
                  {app.logo_url
                    ? <img src={app.logo_url} alt={app.name} className="app-logo" />
                    : (
                      <div className="app-logo-placeholder">
                        <Shield size={20} />
                      </div>
                    )
                  }
                  <div className="app-info">
                    <p className="app-name">{app.name || app.client_id}</p>
                    <p className="app-scopes">
                      {(app.scopes || []).join(' · ')} &bull; Granted {formatDate(app.granted_at)}
                    </p>
                  </div>
                  <button
                    id={`btn-revoke-${app.client_id}`}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                    onClick={() => revokeApp(app.client_id)}
                    disabled={revokingId === app.client_id}
                    title="Revoke access"
                  >
                    {revokingId === app.client_id ? <span className="spinner spinner-primary" /> : <Trash2 size={14} />}
                    Revoke
                  </button>
                </div>
              ))
          }
        </div>
      </div>

      <div className="alert alert-warning" style={{ marginTop: 16 }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>Revoking an app's access will sign you out of that app and require re-authorization.</span>
      </div>
    </>
  );
}
