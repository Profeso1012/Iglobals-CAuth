'use client';

import { useState, useEffect, FormEvent } from 'react';
import { User, Mail, Phone, MapPin, AlertCircle, CheckCircle, Save } from 'lucide-react';

const FIELDS = [
  { id: 'first_name', label: 'First name', icon: User, type: 'text', placeholder: 'Profeso' },
  { id: 'last_name',  label: 'Last name',  icon: User, type: 'text', placeholder: 'Doe' },
  { id: 'phone',      label: 'Phone',      icon: Phone, type: 'tel', placeholder: '+2348012345678' },
  { id: 'address_line1', label: 'Address line 1', icon: MapPin, type: 'text', placeholder: '12 Main Street' },
  { id: 'address_line2', label: 'Address line 2', icon: MapPin, type: 'text', placeholder: 'Apt 3B (optional)' },
  { id: 'city',  label: 'City',    icon: MapPin, type: 'text', placeholder: 'Lagos' },
  { id: 'state', label: 'State',   icon: MapPin, type: 'text', placeholder: 'Lagos State' },
  { id: 'country', label: 'Country (ISO)', icon: MapPin, type: 'text', placeholder: 'NG' },
  { id: 'postal_code', label: 'Postal code', icon: MapPin, type: 'text', placeholder: '100001' },
];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setUser(data);
        const f: Record<string, string> = {};
        FIELDS.forEach(({ id }) => { f[id] = data[id] || ''; });
        setForm(f);
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error_description || 'Update failed.'); return; }
      setUser(data); setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Network error. Try again.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-primary" style={{ width: 32, height: 32 }} /></div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-desc">Manage your personal information.</p>
      </div>

      {/* Avatar + email section */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">Identity</span>
        </div>
        <div className="section-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar avatar-lg">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <p style={{ fontWeight: 600 }}>{user?.first_name} {user?.last_name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Mail size={14} color="var(--color-text-secondary)" />
              <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{user?.email}</span>
              <span className={`badge ${user?.email_verified ? 'badge-green' : 'badge-red'}`}>
                {user?.email_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="section-card">
        <div className="section-header"><span className="section-title">Edit profile</span></div>
        <div className="section-body">
          {error && <div className="alert alert-error"><AlertCircle size={16} /><span>{error}</span></div>}
          {success && <div className="alert alert-success"><CheckCircle size={16} /><span>{success}</span></div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {FIELDS.map(({ id, label, icon: Icon, type, placeholder }) => (
                <div className="form-group" key={id} style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor={`profile-${id}`}>{label}</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Icon size={16} /></span>
                    <input id={`profile-${id}`} type={type} className="form-input"
                      placeholder={placeholder} value={form[id] || ''}
                      onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                      disabled={saving} />
                  </div>
                </div>
              ))}
            </div>
            <button id="btn-save-profile" type="submit" className="btn btn-primary" style={{ marginTop: 24 }} disabled={saving}>
              {saving ? <span className="spinner" /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
