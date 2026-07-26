'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminUser {
  id: string; email: string; email_verified: boolean; phone: string | null;
  phone_verified: boolean; first_name: string; last_name: string;
  is_active: boolean; auth_provider: string; created_at: string;
}

const LIMIT = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    if (verified) params.set('verified', verified);

    const handle = setTimeout(() => {
      fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => { setUsers(d.users || []); setTotal(d.total || 0); })
        .finally(() => setLoading(false));
    }, search ? 300 : 0);

    return () => clearTimeout(handle);
  }, [page, search, status, verified]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function getInitials(u: AdminUser) {
    return `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase();
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-desc">Search, edit, and manage end-user accounts.</p>
      </div>

      <div className="filter-bar">
        <div className="input-wrapper" style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <span className="input-icon"><Search size={16} /></span>
          <input
            className="form-input"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select className="filter-select" value={verified} onChange={e => { setVerified(e.target.value); setPage(1); }}>
          <option value="">Any verification</option>
          <option value="email">Email verified</option>
          <option value="email_pending">Email pending</option>
          <option value="phone">Phone verified</option>
          <option value="phone_pending">Phone pending</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-primary" style={{ width: 32, height: 32 }} /></div>
      ) : users.length === 0 ? (
        <div className="empty-state">No users match these filters.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="clickable" onClick={() => window.location.assign(`/admin/users/${u.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{getInitials(u)}</div>
                      <span style={{ fontWeight: 500 }}>{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{u.email}</span>
                        <span className={`badge ${u.email_verified ? 'badge-green' : 'badge-red'}`}>{u.email_verified ? 'Verified' : 'Unverified'}</span>
                      </div>
                      {u.phone && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{u.phone}</span>}
                    </div>
                  </td>
                  <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Suspended'}</span></td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > LIMIT && (
        <div className="pagination">
          <span>{total} users — page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /> Prev</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
