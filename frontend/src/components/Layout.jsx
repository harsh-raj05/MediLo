import {
  Activity,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileBarChart2,
  History,
  LogOut,
  Menu,
  Package,
  Pill,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MediloBrand, MediloWordmark } from './MediloBrand.jsx';

const NAV_SECTIONS_BY_ROLE = {
  customer: [
    {
      title: 'Storefront',
      links: [
        { to: '/store', label: 'Medicine Store', icon: ShoppingBag },
        { to: '/orders', label: 'My Orders & Invoices', icon: Receipt },
      ],
    },
  ],
  pharmacist: [
    {
      title: 'Core Operations',
      links: [
        { to: '/dashboard', label: 'Dashboard & Alerts', icon: Activity },
        { to: '/pos', label: 'POS Counter Sale', icon: ShoppingCart },
        { to: '/inventory', label: 'Batch Inventory', icon: Package },
        { to: '/purchases', label: 'Purchases (GRN)', icon: ClipboardList },
        { to: '/sales', label: 'Sales & Returns', icon: Receipt },
      ],
    },
    {
      title: 'Ledgers & Analytics',
      links: [
        { to: '/suppliers', label: 'Suppliers & Catalog', icon: Truck },
        { to: '/reports', label: 'Financial Reports', icon: FileBarChart2 },
        { to: '/audit', label: 'Stock Movements', icon: History },
      ],
    },
  ],
  admin: [
    {
      title: 'Core Operations',
      links: [
        { to: '/dashboard', label: 'Dashboard & Alerts', icon: Activity },
        { to: '/pos', label: 'POS Counter Sale', icon: ShoppingCart },
        { to: '/inventory', label: 'Batch Inventory', icon: Package },
        { to: '/purchases', label: 'Purchases (GRN)', icon: ClipboardList },
        { to: '/sales', label: 'Sales & Returns', icon: Receipt },
      ],
    },
    {
      title: 'Governance & Analytics',
      links: [
        { to: '/suppliers', label: 'Suppliers & Catalog', icon: Truck },
        { to: '/reports', label: 'Financial Reports', icon: FileBarChart2 },
        { to: '/audit', label: 'Audit & Movements', icon: History },
        { to: '/users', label: 'Users & Roles', icon: Users },
      ],
    },
  ],
};

const PAGE_TITLES = {
  '/store': 'OTC Medicine Catalog',
  '/orders': 'Customer Order History',
  '/dashboard': 'Operations Overview',
  '/pos': 'Point of Sale Terminal',
  '/inventory': 'Pharmaceutical Batch Inventory',
  '/purchases': 'Goods Received Notes (GRN)',
  '/sales': 'Sales & Customer Returns',
  '/suppliers': 'Vendors & Category Taxonomies',
  '/reports': 'Reconciliation & Financial Ledgers',
  '/audit': 'Immutable Stock & Security Audits',
  '/users': 'Role-Based Access Control',
};

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sections = NAV_SECTIONS_BY_ROLE[user?.role] || [];
  const currentTitle = PAGE_TITLES[location.pathname] || 'Pharmacy Operations';

  const userInitials = (user?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const roleThemeColor =
    user?.role === 'admin'
      ? '#a855f7'
      : user?.role === 'pharmacist'
      ? '#14b8a6'
      : '#38bdf8';

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 45 }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Left Sidebar */}
      <aside
        className={`sidebar no-print ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Brand & Logo */}
        <div className="sidebar-brand">
          <MediloBrand
            iconSize={38}
            textSize="md"
            theme="dark"
            subtitle="Pharmacy Intelligence"
            badge="PRO"
          />
          {mobileMenuOpen && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMobileMenuOpen(false)}
              style={{ padding: '0.25rem', width: 28, height: 28, marginLeft: 'auto' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation by Sections */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {sections.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: '0.65rem' }}>
              <div className="nav-section-label">{section.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {section.links.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={18} strokeWidth={2} style={{ opacity: 0.9, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Sign Out */}
        <div className="sidebar-user-card">
          <div className="user-profile-badge">
            <div
              className="user-avatar"
              style={{ borderColor: roleThemeColor }}
            >
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: roleThemeColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {user?.role}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
            }}
            onClick={logout}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Modern Safety / Disclaimer Banner */}
        <div className="safety-banner no-print">
          <ShieldCheck size={16} strokeWidth={2.2} style={{ flexShrink: 0, color: 'var(--primary)' }} />
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
            <strong>Demonstration Sandbox:</strong> Stock quantities and medicines are simulated for testing FEFO inventory and audit reconciliation.
          </div>
        </div>

        {/* Topbar Header */}
        <header className="topbar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMobileMenuOpen(true)}
              style={{ display: 'none' }}
              id="mobile-nav-toggle"
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>

            <div className="topbar-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MediloWordmark size="sm" theme="light" />
              <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{currentTitle}</span>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="live-indicator">
              <span className="live-indicator-dot" />
              <span>FEFO Engine Active</span>
            </div>

            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.4rem' }}
            >
              <span>Swagger API Docs</span>
              <ExternalLink size={13} style={{ opacity: 0.7 }} />
            </a>
          </div>
        </header>

        {/* Content View */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 860px) {
          #mobile-nav-toggle {
            display: inline-flex !important;
          }
          .sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px !important;
            height: 100vh !important;
            z-index: 50 !important;
            transform: translateX(-100%);
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
          }
          .sidebar.mobile-open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </div>
  );
};
