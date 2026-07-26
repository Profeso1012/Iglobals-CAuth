'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, User, Mail, Phone, MapPin,
  Monitor, Grid3x3, Clock, Send, LogOut as LogOutIcon, X,
} from 'lucide-react';
import { ToggleSwitch, ConfirmModal } from '@/components/AdminUI';

const FIELDS = [
  { id: 'first_name', label: 'First name', icon: User, type: 'text' },
  { id: 'last_name', label: 'Last name', icon: User, type: 'text' },
  { id: 'email', label: 'Email', icon: Mail, type: 'email' },
  { id: 'phone', label: 'Phone', icon: Phone, type: 'tel' },
  { id: 'address_line1', label: 'Address line 1', icon: MapPin, type: 'text' },
  { id: 'address_line2', label: 'Address line 2', icon: MapPin, type: 'text' },
  { id: 'city', label: 'City', icon: MapPin, type: 'text' },
  { id: 'state', label: 'State', icon: MapPin, type: 'text' },
  { id: 'country', label: 'Country (ISO)', icon: MapPin, type: 'text' },
  { id: 'postal_code', label: 'Postal code', icon: MapPin, type: 'text' },
];

interface UserDetail {
  id: string; email: string; email_verified: boolean; phone: string | null; phone_verified: boolean;
  first_name: string; last_name: string; is_active: boolean; auth_provider: string;
  address_line1: string | null; address_line2: string | null; city: string | null;
  state: string | null; country: string | null; postal_code: string | null; created_at: string;
}

interface SessionRow { id: string; user_agent: string; ip_address: string; last_active_at: string; created_at: string; }
interface AppRow { client_id: string; name: string; logo_url: string | null; scopes: string[]; granted_at: string; }
interface ActivityRow { id: string; event_type: string; created_at: string; }

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  function load() {
    fetch(`/api/admin/users/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setUser(d.user);
        setSessions(d.sessions || []);
        setApps(d.apps || []);
        setActivity(d.activity || []);
        const f: Record<string, string> = {};
        const userRecord = d.user as Record<string, unknown>;
        FIELDS.forEach(({ id }) => { f[id] = (userRecord[id] as string) || ''; });
        setForm(f);
        setIsActive(d.user.is_active);
        setEmailVerified(d.user.email_verified);
        setPhoneVerified(d.user.phone_verified);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [userId]);

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, is_active: isActive, email_verified: emailVerified, phone_verified: phoneVerified }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error_description || 'Failed to save.'); return; }
      setUser(data.user);
      setSuccess('User updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Network error. Try again.'); }
    finally { setSaving(false); }
  }

  async function handleRevokeSessions() {
    setRevoking(true);
    try {
      await fetch(`/api/admin/users/${userId}/revoke-sessions`, { method: 'POST', credentials: 'include' });
      setShowRevokeConfirm(false);
      load();
    } finally { setRevoking(false); }
  }

  async function handleSendReset() {
    setSendingReset(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) { setError(data.error_description || 'Failed to send reset email.'); return; }
      setSuccess('Password reset email sent.');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Network error. Try again.'); }
    finally { setSendingReset(false); }
  }

  async function handleRevokeApp(clientId: string) {
    await fetch(`/api/admin/users/${userId}/apps/${clientId}`, { method: 'DELETE', credentials: 'include' });
    setApps(a => a.filter(x => x.client_id !== clientId));
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-primary" style={{ width: 32, height: 32 }} /></div>;
  if (!user) return <div className="alert alert-error">User not found.</div>;

  return (
    <>
      <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => router.push('/admin/users')}>
        <ArrowLeft size={16} /> Back to users
      </button>

      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="avatar avatar-lg">{user.first_name?.[0]}{user.last_name?.[0]}</div>
        <div>
          <h1 className="page-title">{user.first_name} {user.last_name}</h1>
          <p className="page-desc">{user.email} · Joined {new Date(user.created_at).toLocaleDateString()} · {user.auth_provider}</p>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header"><span className="section-title">Profile</span></div>
        <div className="section-body">
          {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}
          {success && <div className="alert alert-success"><CheckCircle size={16} /><span>{success}</span></div>}

          <div className="toggle-row">
            <div>
              <div className="toggle-row-label">Account active</div>
              <div className="toggle-row-desc">Suspended users cannot sign in.</div>
            </div>
            <ToggleSwitch checked={isActive} onChange={setIsActive} disabled={saving} />
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-row-label">Email verified</div>
              <div className="toggle-row-desc">Manually mark this user&apos;s email as verified.</div>
            </div>
            <ToggleSwitch checked={emailVerified} onChange={setEmailVerified} disabled={saving} />
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-row-label">Phone verified</div>
              <div className="toggle-row-desc">Manually mark this user&apos;s phone as verified.</div>
            </div>
            <ToggleSwitch checked={phoneVerified} onChange={setPhoneVerified} disabled={saving} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
            {FIELDS.map(({ id, label, icon: Icon, type }) => (
              <div className="form-group" key={id} style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor={`admin-user-${id}`}>{label}</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Icon size={16} /></span>
                  <input id={`admin-user-${id}`} type={type} className="form-input"
                    value={form[id] || ''}
                    onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                    disabled={saving} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn btn-ghost" onClick={handleSendReset} disabled={sendingReset || !user}>
              {sendingReset ? <span className="spinner" /> : <Send size={16} />}
              Send password reset email
            </button>
            <button className="btn btn-ghost" onClick={() => setShowRevokeConfirm(true)}>
              <LogOutIcon size={16} /> Revoke all sessions
            </button>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header"><span className="section-title">Active sessions ({sessions.length})</span></div>
        <div className="section-body">
          {sessions.length === 0 ? (
            <div className="empty-state">No active sessions.</div>
          ) : sessions.map(s => (
            <div className="session-row" key={s.id}>
              <Monitor size={18} color="var(--color-text-secondary)" />
              <div className="session-info">
                <div className="session-ua">{s.user_agent}</div>
                <div className="session-meta">{s.ip_address} · last active {new Date(s.last_active_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-header"><span className="section-title">Authorized apps ({apps.length})</span></div>
        <div className="section-body">
          {apps.length === 0 ? (
            <div className="empty-state">No authorized apps.</div>
          ) : apps.map(a => (
            <div className="app-card" key={a.client_id}>
              {a.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.logo_url} alt="" className="app-logo" />
              ) : (
                <div className="app-logo-placeholder"><Grid3x3 size={18} /></div>
              )}
              <div className="app-info">
                <div className="app-name">{a.name}</div>
                <div className="app-scopes">{a.scopes.join(', ')} · granted {new Date(a.granted_at).toLocaleDateString()}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => handleRevokeApp(a.client_id)}>
                <X size={14} /> Revoke
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-header"><span className="section-title">Recent activity</span></div>
        <div className="section-body">
          {activity.length === 0 ? (
            <div className="empty-state">No recorded activity.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activity.map(ev => (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <Clock size={14} color="var(--color-text-secondary)" />
                  <span style={{ fontWeight: 500 }}>{ev.event_type}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(ev.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRevokeConfirm && (
        <ConfirmModal
          title="Revoke all sessions"
          description="This immediately signs this user out of every device. They will need to log in again."
          confirmLabel="Revoke all"
          danger
          loading={revoking}
          onConfirm={handleRevokeSessions}
          onCancel={() => setShowRevokeConfirm(false)}
        />
      )}
    </>
  );
}
