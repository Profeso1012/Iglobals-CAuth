'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '../app/(auth)/auth-styles.css';

/* ── SVG Icons ────────────────────────────────────────────── */
export const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.842 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

export const AppleIcon = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Get initial theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'dark' : 'light');

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={theme === 'dark' ? '/apple-logo-svgrepo-com (1).svg' : '/apple-logo-svgrepo-com.svg'}
      alt="Apple"
      width="16"
      height="16"
      style={{ display: 'block' }}
    />
  );
};

export const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export const LockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

/* ── Logo ────────────────────────────────────────────────── */
export const IGlobalsLogo = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/logo.png" alt="iGlobals" className="auth-logo" />
);

/* ── Tabs ────────────────────────────────────────────────── */
interface TabsProps {
  active: 'login' | 'register';
  onSwitch: (tab: 'login' | 'register') => void;
}

export const AuthTabs = ({ active, onSwitch }: TabsProps) => (
  <div className="auth-tabs">
    <button 
      className={`auth-tab ${active === 'login' ? 'active' : ''}`}
      onClick={() => onSwitch('login')}
    >
      Sign In
    </button>
    <button 
      className={`auth-tab ${active === 'register' ? 'active' : ''}`}
      onClick={() => onSwitch('register')}
    >
      Sign Up
    </button>
  </div>
);

/* ── Social Buttons ──────────────────────────────────────── */
interface SocialButtonsProps {
  oauthContext?: any;
}

export const SocialButtons = ({ oauthContext }: SocialButtonsProps) => {
  const handleGoogleLogin = () => {
    let url = '/api/auth/google/login';
    if (oauthContext?.client_id) {
      const params = new URLSearchParams({
        client_id: oauthContext.client_id,
        redirect_uri: oauthContext.redirect_uri || '',
        state: oauthContext.state || '',
        code_challenge: oauthContext.code_challenge || '',
        scope: oauthContext.scopes?.join(' ') || 'openid profile email',
      });
      url += '?' + params.toString();
    }
    window.location.href = url;
  };

  const handleAppleLogin = () => {
    // Placeholder for now - no action
    console.log('Apple Sign-In coming soon');
  };

  return (
    <div className="auth-social-row">
      <button className="auth-social-btn" onClick={handleGoogleLogin}>
        <GoogleIcon />
        Google
      </button>
      <button className="auth-social-btn" onClick={handleAppleLogin}>
        <AppleIcon />
        Apple
      </button>
    </div>
  );
};

/* ── Divider ─────────────────────────────────────────────── */
export const Divider = ({ text }: { text?: string }) => (
  <div className="auth-divider">
    {text && <span className="auth-divider-text">{text}</span>}
  </div>
);

/* ── Input Field ─────────────────────────────────────────── */
interface InputFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  name?: string;
}

export const InputField = ({ label, type = 'text', value, onChange, placeholder, autoFocus, name }: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="auth-input-wrap" style={{ position: 'relative', marginBottom: '1.25rem' }}>
      <label className="auth-label">{label}</label>
      {isPassword ? (
        <div style={{ position: 'relative' }}>
          <input
            type={inputType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
            name={name}
            className="auth-input"
            autoComplete={name}
          />
          <button
            type="button"
            className="auth-eye-btn"
            onClick={() => setShowPassword(s => !s)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      ) : (
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          name={name}
          className="auth-input"
          autoComplete={name}
        />
      )}
    </div>
  );
};

/* ── Checkbox ────────────────────────────────────────────── */
interface CheckboxProps {
  children: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Checkbox = ({ children, checked, onChange }: CheckboxProps) => (
  <label className="auth-check">
    <input 
      type="checkbox" 
      checked={checked}
      onChange={e => onChange?.(e.target.checked)}
    />
    <span>{children}</span>
  </label>
);

/* ── Buttons ─────────────────────────────────────────────── */
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit';
}

export const Button = ({ children, onClick, disabled, variant = 'primary', type = 'button' }: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={variant === 'primary' ? 'auth-btn-primary' : 'auth-btn-secondary'}
  >
    {children}
  </button>
);

/* ── Illustration Photo (iGlobals themed) ──────────────────── */
export const AuthIllustration = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img 
    src="/login.png" 
    alt="Team collaboration" 
    style={{
      width: '100%',
      maxWidth: '510px',
      height: 'auto',
      objectFit: 'cover',
      borderRadius: '16px'
    }}
  />
);
