'use client';

import { useEffect, useState } from 'react';
import { Users, Grid3x3, Activity, Mail, UserCheck } from 'lucide-react';

interface Overview {
  users: {
    total: number; active: number; suspended: number;
    email_verified: number; phone_verified: number; signups_today: number;
  };
  growth: { date: string; count: number }[];
  login_activity: { date: string; event_type: string; count: number }[];
  top_clients: { client_id: string; name: string; logo_url: string | null; active_users: number }[];
  active_sessions: number;
  clients: { total: number; active: number };
}

const DAYS = 30;

function dateKey(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function last30Days() {
  const out: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function formatShort(key: string) {
  return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics/overview', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load analytics.'); setLoading(false); });
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-primary" style={{ width: 32, height: 32 }} /></div>;
  if (error || !data) return <div className="alert alert-error">{error || 'No data.'}</div>;

  const days = last30Days();
  const growthByDay = new Map(data.growth.map(g => [dateKey(g.date), g.count]));
  const growthSeries = days.map(d => ({ date: d, count: growthByDay.get(d) || 0 }));
  const maxGrowth = Math.max(1, ...growthSeries.map(d => d.count));

  const loginMap = new Map<string, { success: number; failed: number }>();
  days.forEach(d => loginMap.set(d, { success: 0, failed: 0 }));
  data.login_activity.forEach(r => {
    const key = dateKey(r.date);
    const entry = loginMap.get(key);
    if (!entry) return;
    if (r.event_type === 'auth.login.success') entry.success = r.count;
    else entry.failed = r.count;
  });
  const loginSeries = days.map(d => ({ date: d, ...loginMap.get(d)! }));
  const maxLogin = Math.max(1, ...loginSeries.map(d => d.success + d.failed));

  const maxTopClient = Math.max(1, ...data.top_clients.map(c => c.active_users));
  const verifiedPct = data.users.total ? Math.round((data.users.email_verified / data.users.total) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-desc">Growth and performance across users and OAuth clients.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-tile-label"><Users size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Total users</div>
          <div className="stat-tile-value">{data.users.total.toLocaleString()}</div>
          <div className="stat-tile-sub">+{data.users.signups_today} today</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label"><UserCheck size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Active users</div>
          <div className="stat-tile-value">{data.users.active.toLocaleString()}</div>
          <div className="stat-tile-sub">{data.users.suspended} suspended</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label"><Mail size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Email verified</div>
          <div className="stat-tile-value">{verifiedPct}%</div>
          <div className="stat-tile-sub">{data.users.email_verified.toLocaleString()} of {data.users.total.toLocaleString()}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label"><Grid3x3 size={12} style={{ verticalAlign: -2, marginRight: 4 }} />OAuth clients</div>
          <div className="stat-tile-value">{data.clients.active}</div>
          <div className="stat-tile-sub">{data.clients.total} total</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-label"><Activity size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Active sessions</div>
          <div className="stat-tile-value">{data.active_sessions.toLocaleString()}</div>
          <div className="stat-tile-sub">Signed in right now</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-title">Signups — last 30 days</span>
        </div>
        <div className="bar-chart">
          {growthSeries.map(d => (
            <div key={d.date} className="bar-chart-col">
              <div className="bar bar-primary" style={{ height: `${(d.count / maxGrowth) * 100}%` }} />
              <span className="bar-tooltip">{formatShort(d.date)}: {d.count}</span>
            </div>
          ))}
        </div>
        <div className="chart-axis-labels">
          <span>{formatShort(days[0])}</span>
          <span>{formatShort(days[days.length - 1])}</span>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-title">Login activity — last 30 days</span>
          <div className="chart-legend">
            <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: 'var(--color-success)' }} />Success</span>
            <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: 'var(--color-error)' }} />Failed</span>
          </div>
        </div>
        <div className="bar-chart">
          {loginSeries.map(d => (
            <div key={d.date} className="bar-chart-col">
              <div className="bar bar-success" style={{ height: `${(d.success / maxLogin) * 100}%` }} />
              <div className="bar bar-error" style={{ height: `${(d.failed / maxLogin) * 100}%` }} />
              <span className="bar-tooltip">{formatShort(d.date)}: {d.success} success, {d.failed} failed</span>
            </div>
          ))}
        </div>
        <div className="chart-axis-labels">
          <span>{formatShort(days[0])}</span>
          <span>{formatShort(days[days.length - 1])}</span>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-title">Top apps by active users</span>
        </div>
        {data.top_clients.length === 0 ? (
          <div className="empty-state">No OAuth clients have active users yet.</div>
        ) : (
          <div className="top-list">
            {data.top_clients.map(c => (
              <div className="top-list-row" key={c.client_id}>
                <span className="top-list-label" title={c.name}>{c.name}</span>
                <div className="top-list-track">
                  <div className="top-list-fill" style={{ width: `${(c.active_users / maxTopClient) * 100}%` }} />
                </div>
                <span className="top-list-value">{c.active_users}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
