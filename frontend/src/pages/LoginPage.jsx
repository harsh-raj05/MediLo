import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Pill,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MediloBrand } from '../components/MediloBrand.jsx';

const DEMO_ACCOUNTS = [
  {
    label: 'Pharmacist',
    email: 'pharmacist@medilo.demo',
    password: 'DemoPassword123!',
    role: 'POS, Batches & Returns',
    badge: 'Recommended',
    badgeColor: 'var(--primary)',
  },
  {
    label: 'Admin',
    email: 'admin@medilo.demo',
    password: 'DemoPassword123!',
    role: 'Catalog & Audit Trail',
    badge: 'Executive',
    badgeColor: '#8b5cf6',
  },
  {
    label: 'Customer',
    email: 'customer@medilo.demo',
    password: 'DemoPassword123!',
    role: 'Online OTC Storefront',
    badge: 'Consumer',
    badgeColor: '#0ea5e9',
  },
];

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('pharmacist@medilo.demo');
  const [password, setPassword] = useState('DemoPassword123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'customer' ? '/store' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* Left Side: Showcase with Rich Background Image */}
      <div
        className="auth-hero-pane"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1600&q=80')`,
        }}
      >
        <div className="auth-hero-overlay" />

        {/* Top Brand */}
        <div className="auth-hero-content">
          <div style={{ marginBottom: '2.5rem' }}>
            <MediloBrand
              iconSize={46}
              textSize="lg"
              theme="dark"
              subtitle="Enterprise Pharmacy Platform"
              badge="ENTERPRISE"
            />
          </div>

          <div className="hero-badge">
            <Sparkles size={13} />
            <span>FEFO Compliance &amp; Precision Inventory</span>
          </div>

          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
              maxWidth: '560px',
              color: '#79b7c0ff'
            }}
          >
            Intelligent batch control from supplier delivery to patient dispensing.
          </h2>

          <p
            style={{
              fontSize: '1rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
              maxWidth: '520px',
              marginBottom: '2.25rem',
            }}
          >
            Built for modern pharmacies requiring automated FEFO stock rotation, zero-variance reconciliation, and immutable regulatory audit trails.
          </p>

          {/* Value Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(45, 212, 191, 0.2)',
                  color: '#2dd4bf',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Check size={14} strokeWidth={3} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem' }}>Guaranteed FEFO Dispatch</strong>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Earliest-expiring batches are automatically prioritized; expired batches are strictly blocked.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(45, 212, 191, 0.2)',
                  color: '#2dd4bf',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Check size={14} strokeWidth={3} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem' }}>Zero-Variance Stock Reconciliation</strong>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Mathematical proof reconciling Opening + Inward − Sales + Returns with physical inventory.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Glassmorphic Footer Pill */}
        <div
          className="auth-hero-content"
          style={{
            marginTop: '2.5rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '520px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              Audit Security Status
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              100% FEFO Adherence · Active Sandbox
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2dd4bf', fontSize: '0.82rem', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Verified
          </div>
        </div>
      </div>

      {/* Right Side: Clean Interactive Form Canvas */}
      <div className="auth-form-pane">
        <div className="auth-form-card">
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <MediloBrand
                iconSize={38}
                textSize="md"
                theme="light"
                subtitle="Workspace Access Portal"
                badge="AUTH"
              />
            </div>
            <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Sign In to Workspace
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Access POS counter, batch inventory &amp; reporting suites.
            </p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: '2.4rem' }}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@medilo.demo"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.4rem' }}>
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingLeft: '2.4rem', paddingRight: '2.5rem' }}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 4,
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', gap: '0.65rem' }}
              disabled={submitting}
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* 1-Click Interactive Demo Persona Cards */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                }}
              >
                1-Click Demo Personas
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                Instant Autofill
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = email === acc.email;
                return (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                    }}
                    style={{
                      background: isSelected ? 'var(--primary-subtle)' : '#ffffff',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      padding: '0.75rem 0.65rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.2)' : 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                        {acc.label}
                      </span>
                      {isSelected && <Check size={14} color="var(--primary)" strokeWidth={2.5} />}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {acc.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Registration Link */}
          <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Need an OTC customer account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Register as Customer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
