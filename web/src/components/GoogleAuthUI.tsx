'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ---- SVG Icons ---- */
export const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
);

export const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6"/>
    </svg>
);

export const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

/* ---- iGlobals Logo ---- */
export const IGlobalsLogo = ({ style }: { style?: React.CSSProperties }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="iGlobals" className="auth-logo" style={style} />
);

/* ---- Back Button ---- */
export const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} className="auth-back-btn" aria-label="Go back">
        <ArrowLeftIcon />
    </button>
);

/* ---- Footer ---- */
export const Footer = () => (
    <div className="auth-footer">
        <div className="auth-footer-lang">
            <span>English (United States)</span>
            <ChevronDownIcon />
        </div>
        <div className="auth-footer-links">
            <Link href="#">Help</Link>
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
        </div>
    </div>
);

/* ---- Floating-label Input Field ---- */
interface InputFieldProps {
    label: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    suffix?: string;
    autoFocus?: boolean;
}

export const InputField = ({ label, type = 'text', value, onChange, error, suffix, autoFocus }: InputFieldProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const innerClass = [
        'auth-field-inner',
        isFocused ? 'focused' : '',
        value ? 'has-value' : '',
        error ? 'has-error' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="auth-field">
            <div className={innerClass}>
                <label className="auth-field-label">{label}</label>
                <input
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoFocus={autoFocus}
                    className="auth-field-input"
                    style={{ paddingTop: isFocused || value ? '10px' : '0' }}
                />
                {suffix && <span className="auth-field-suffix">{suffix}</span>}
                {isPassword && (
                    <button
                        type="button"
                        className="auth-field-toggle"
                        onClick={() => setShowPassword(s => !s)}
                    >
                        {showPassword ? 'Hide' : 'Show'}
                    </button>
                )}
            </div>
            {error && <p className="auth-field-error">{error}</p>}
        </div>
    );
};

/* ---- Select / Dropdown Field ---- */
interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
}

export const SelectField = ({ label, value, onChange, options }: SelectFieldProps) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--auth-blue)', marginBottom: 4, marginLeft: 4 }}>
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(o => !o)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid var(--auth-border)',
                    borderRadius: 4,
                    padding: '12px 16px',
                    color: 'var(--auth-text)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 16,
                }}
            >
                <span>{value}</span>
                <ChevronDownIcon />
            </button>
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    zIndex: 20,
                    width: '100%',
                    marginTop: 4,
                    background: 'var(--auth-card-bg)',
                    border: '1px solid var(--auth-border)',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                    maxHeight: 240,
                    overflowY: 'auto',
                }}>
                    {options.map(opt => (
                        <button
                            type="button"
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '10px 16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: 14,
                                color: 'var(--auth-text)',
                            }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
