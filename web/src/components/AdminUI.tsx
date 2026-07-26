'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Copy, Check, X } from 'lucide-react';

/**
 * Portals to document.body so `position: fixed` is always relative to the
 * real viewport — nesting a modal inside an animated ancestor (anything with
 * an active `transform`, e.g. .animate-fade-in) otherwise creates a new
 * containing block and breaks full-viewport centering + outside-click.
 */
export function ModalOverlay({ onClose, children, cardStyle }: {
  onClose?: () => void;
  children: React.ReactNode;
  cardStyle?: React.CSSProperties;
}) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={cardStyle} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function SecretModal({ title, clientId, secret, onClose }: { title: string; clientId?: string; secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <span className="section-title">{title}</span>
      </div>
      <div className="alert alert-warning">
        <AlertCircle size={16} />
        <span>This secret is shown only once. Copy it now — it cannot be retrieved later.</span>
      </div>
      {clientId && (
        <div className="form-group">
          <label className="form-label">Client ID</label>
          <div className="secret-box"><span>{clientId}</span></div>
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Client secret</label>
        <div className="secret-box">
          <span>{secret}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy} aria-label="Copy secret">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <button className="btn btn-primary btn-full" onClick={onClose}>Done</button>
    </ModalOverlay>
  );
}

export function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="switch-track"><span className="switch-thumb" /></span>
    </label>
  );
}

export function ConfirmModal({ title, description, confirmLabel = 'Confirm', danger, onConfirm, onCancel, loading }: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <ModalOverlay onClose={onCancel} cardStyle={{ maxWidth: 420 }}>
      <div className="modal-header">
        <span className="section-title">{title}</span>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} aria-label="Close"><X size={16} /></button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>{description}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {confirmLabel}
        </button>
      </div>
    </ModalOverlay>
  );
}
