'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Lock, Eye, EyeOff, Monitor, Smartphone, AlertCircle, CheckCircle, Trash2, LogOut } from 'lucide-react';

export default function SecurityPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [hasPassword, setHasPassword] = useState(true); // Track if user has password set

  useEffect(() => {
    // Check if user has a password set
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // Check has_password flag
        setHasPassword(data.has_password !== false);
      })
      .catch(() => {});
      
    fetch('/api/auth/sessions', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setSessions(data.sessions || []); setLoadingSessions(false); });
  }, []);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (form.new_password !== form.confirm) { setPwdError('Passwords do not match.'); return; }
    if (form.new_password.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    setSaving(true); setPwdError(''); setPwdSuccess('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = { 
          invalid_credentials: 'Current password is incorrect.',
          no_password_set: 'No password is currently set. Use "*" as current password to set your first password.'
        };
        setPwdError(map[data.error] || data.error_description || 'Failed.'); return;
      }
      setPwdSuccess(data.message || 'Password changed successfully.');
      setForm({ current_password: '', new_password: '', confirm: '' });
      setHasPassword(true); // Now user has a password
      setTimeout(() => setPwdSuccess(''), 4000);
    } catch { setPwdError('Network error. Try again.'); }
    finally { setSaving(false); }
  }

  async function revokeSession(id: string) {
    await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE', credentials: 'include' });
    setSessions(s => s.filter(x => x.id !== id));
  }

  function getDeviceIcon(ua: string) {
    if (/mobile|android|iphone/i.test(ua)) return <Smartphone size={18} />;
    return <Monitor size={18} />;
  }

  function formatDate(d: string) { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Security</h1>
        <p className="page-desc">Manage your password and active sessions.</p>
      </div>

      {/* Password change */}
      <div className="section-card">
        <div className="section-header"><span className="section-title">Change password</span></div>
        <div className="section-body">
          {!hasPassword && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>
                Signed up with Google? 
                Enter <strong>*</strong> as your current password.
              </span>
            </div>
          )}
          {pwdError && <div className="alert alert-error"><AlertCircle size={16} /><span>{pwdError}</span></div>}
          {pwdSuccess && <div className="alert alert-success"><CheckCircle size={16} /><span>{pwdSuccess}</span></div>}
          <form onSubmit={handleChangePassword}>
            {[
              { id: 'current_password', label: hasPassword ? 'Current password' : 'Current password (enter * for first-time)', key: 'current_password', placeholder: hasPassword ? '••••••••' : 'Enter * (asterisk)' },
              { id: 'new_password',     label: 'New password',     key: 'new_password', placeholder: '••••••••' },
              { id: 'confirm',          label: 'Confirm password', key: 'confirm', placeholder: '••••••••' },
            ].map(({ id, label, key, placeholder }) => (
              <div className="form-group" key={id}>
                <label className="form-label" htmlFor={id}>{label}</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={16} /></span>
                  <input id={id} type={showPwd ? 'text' : 'password'} className="form-input"
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    disabled={saving} />
                  {id === 'new_password' && (
                    <button type="button" className="input-action" onClick={() => setShowPwd(p => !p)}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button id="btn-change-password" type="submit" className="btn btn-primary" disabled={saving || !form.current_password || !form.new_password}>
              {saving ? <span className="spinner" /> : <Lock size={16} />}
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>

      {/* Sessions */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Active sessions</span>
          <span className="badge badge-gray">{sessions.length}</span>
        </div>
        <div className="section-body">
          {loadingSessions
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><span className="spinner spinner-primary" /></div>
            : sessions.length === 0
              ? <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>No active sessions found.</p>
              : sessions.map(s => (
                <div key={s.id} className="session-row">
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{getDeviceIcon(s.user_agent || '')}</div>
                  <div className="session-info">
                    <p className="session-ua">{s.user_agent || 'Unknown device'}</p>
                    <p className="session-meta">
                      {s.ip_address || 'Unknown IP'} &bull; Last active {formatDate(s.last_active_at)}
                      {s.current && <span className="badge badge-blue" style={{ marginLeft: 8 }}>This session</span>}
                    </p>
                  </div>
                  {!s.current && (
                    <button className="btn btn-ghost btn-sm" onClick={() => revokeSession(s.id)} title="Revoke session">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
          }
        </div>
      </div>
    </>
  );
}
