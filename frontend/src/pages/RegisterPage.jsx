import {
  ArrowRight,
  Check,
  Lock,
  Mail,
  Phone,
  Pill,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MediloBrand } from '../components/MediloBrand.jsx';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/store', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* Left Showcase Pane */}
      <div
        className="auth-hero-pane"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80')`,
        }}
      >
        <div className="auth-hero-overlay" />

        <div className="auth-hero-content">
          <div style={{ marginBottom: '2.5rem' }}>
            <MediloBrand
              iconSize={46}
              textSize="lg"
              theme="dark"
              subtitle="Customer OTC Care Portal"
              badge="OTC CARE"
            />
          </div>

          <div className="hero-badge">
            <Sparkles size={13} />
            <span>Customer OTC Self-Checkout</span>
          </div>

          <h2
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
              maxWidth: '560px',
              color: '#95bfcdff'
            }}
          >
            Order non-prescription medications with certified batch provenance.
          </h2>

          <p
            style={{
              fontSize: '1rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
              maxWidth: '520px',
              marginBottom: '2rem',
            }}
          >
            Create an account to browse over-the-counter wellness essentials, view allocated expiry dates, and download official itemized invoices.
          </p>

          <div className="auth-hero-value-props" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px' }}>
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
                <strong style={{ fontSize: '0.92rem' }}>Certified OTC Formulary</strong>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Restricted to non-prescription essentials with verified batch authenticity.
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
                <strong style={{ fontSize: '0.92rem' }}>Digital Invoice History</strong>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Instant access to itemized GST tax invoices with lot numbers and expiry dates.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="auth-hero-content auth-hero-pill-badge"
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
              Pharmacy Assurance
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              Quality Checked Batches · Safe Delivery
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2dd4bf', fontSize: '0.82rem', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Certified
          </div>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="auth-form-pane">
        <div className="auth-form-card">
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <MediloBrand
                iconSize={38}
                textSize="md"
                theme="light"
                subtitle="New Customer Account"
                badge="SIGN UP"
              />
            </div>
            <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Customer Registration
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Get started with fast self-checkout and instant invoice generation.
            </p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">
                Full Legal Name
              </label>
              <div style={{ position: 'relative' }}>
                <User
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
                  id="reg-name"
                  className="input"
                  style={{ paddingLeft: '2.4rem' }}
                  required
                  minLength={2}
                  placeholder="Priya Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">
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
                  id="reg-email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: '2.4rem' }}
                  required
                  placeholder="priya.sharma@example.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">
                Mobile Phone (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
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
                  id="reg-phone"
                  className="input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="+91 98765 01099"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.4rem' }}>
              <label className="form-label" htmlFor="reg-password">
                Password (minimum 8 characters)
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
                  id="reg-password"
                  type="password"
                  className="input"
                  style={{ paddingLeft: '2.4rem' }}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', gap: '0.65rem' }}
              disabled={submitting}
            >
              <span>{submitting ? 'Creating Account...' : 'Register & Enter Store'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Sign In to Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
