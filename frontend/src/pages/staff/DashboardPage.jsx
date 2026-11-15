import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  IndianRupee,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, formatDate, formatMoney } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [aRes, vRes, sRes] = await Promise.all([
        apiRequest('/inventory/alerts'),
        apiRequest('/reports/stock-valuation'),
        apiRequest('/reports/sales'),
      ]);
      setAlerts(aRes.data);
      setValuation(vRes.data);
      setSalesSummary(sRes.data?.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <LoadingSpinner label="Loading pharmacy operations dashboard..." />;

  const expiryIssuesCount =
    (alerts?.summary?.nearExpiryCount || 0) + (alerts?.summary?.expiredOnHandCount || 0);

  return (
    <div>
      {/* Operational Welcome Banner with Background Image */}
      <div
        className="hero-banner"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80')`,
        }}
      >
        <div className="hero-banner-overlay" />
        <div className="hero-banner-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="hero-badge">
                <Sparkles size={13} />
                <span>Live Dispensary Operations · Shift Active</span>
              </div>
              <h1
                style={{
                  margin: '0 0 0.4rem',
                  fontSize: '1.95rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                }}
              >
                Welcome back, {user?.name || 'Staff Operator'}
              </h1>
              <p
                style={{
                  margin: '0 0 1.25rem',
                  color: '#cbd5e1',
                  fontSize: '0.94rem',
                  maxWidth: '580px',
                  lineHeight: 1.5,
                }}
              >
                FEFO batch prioritization is running. Stock levels, expiry horizons, and real-time counter sales are synchronized with the central audit ledger.
              </p>
            </div>

            {/* Quick Actions in Banner */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={loadDashboard}
                title="Refresh metrics"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <Link
                to="/purchases"
                className="btn btn-secondary"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Plus size={15} /> Receive Purchase
              </Link>
              <Link to="/pos" className="btn btn-primary" style={{ boxShadow: '0 4px 15px rgba(13, 148, 136, 0.5)' }}>
                <ShoppingCart size={15} /> Open POS Counter
              </Link>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* KPI Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        {/* Metric 1: Stock Valuation */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Sellable Stock Cost</span>
            <div className="stat-icon-disc teal">
              <PackageCheck size={20} />
            </div>
          </div>
          <div className="stat-value">{formatMoney(valuation?.summary?.sellableCostValue)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              {valuation?.summary?.sellableUnits?.toLocaleString() || 0}
            </span>{' '}
            sellable units on hand
          </div>
        </div>

        {/* Metric 2: Net Revenue */}
        <div className="stat-card stat-success">
          <div className="stat-header">
            <span className="stat-label">Net Sales Revenue</span>
            <div className="stat-icon-disc emerald">
              <IndianRupee size={20} />
            </div>
          </div>
          <div className="stat-value">{formatMoney(salesSummary?.netRevenue)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              {salesSummary?.invoiceCount || 0}
            </span>{' '}
            settled invoices
          </div>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div className={`stat-card ${alerts?.summary?.lowStockCount > 0 ? 'stat-warning' : 'stat-success'}`}>
          <div className="stat-header">
            <span className="stat-label">Low-Stock Alerts</span>
            <div className={`stat-icon-disc ${alerts?.summary?.lowStockCount > 0 ? 'amber' : 'emerald'}`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{ color: alerts?.summary?.lowStockCount > 0 ? 'var(--warning)' : 'var(--success)' }}
          >
            {alerts?.summary?.lowStockCount || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Medicines below reorder threshold
          </div>
        </div>

        {/* Metric 4: Expiry Warnings */}
        <div className={`stat-card ${expiryIssuesCount > 0 ? 'stat-danger' : 'stat-success'}`}>
          <div className="stat-header">
            <span className="stat-label">Expiry Criticals</span>
            <div className={`stat-icon-disc ${expiryIssuesCount > 0 ? 'rose' : 'emerald'}`}>
              <Clock size={20} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{ color: expiryIssuesCount > 0 ? 'var(--danger)' : 'var(--text)' }}
          >
            {expiryIssuesCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {alerts?.summary?.nearExpiryCount || 0} near expiry · {alerts?.summary?.expiredOnHandCount || 0} expired (blocked)
          </div>
        </div>
      </div>

      {/* Two Column Operational Tables */}
      <div className="grid-2">
        {/* Left: Low Stock Panel */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.15rem',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.12rem' }}>Reorder Priority (Low Stock)</h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Medicines needing immediate purchase replenishment
              </div>
            </div>
            <Link to="/purchases" className="btn btn-secondary btn-sm">
              <span>Restock</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {!alerts?.lowStockMedicines?.length ? (
            <EmptyState
              title="Inventory healthy"
              description="All pharmaceutical catalog items currently exceed their configured reorder thresholds."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medicine &amp; SKU</th>
                    <th className="num">Sellable Stock</th>
                    <th className="num">Reorder Min</th>
                    <th>Stock Ratio</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.lowStockMedicines.map((m) => {
                    const ratio = m.reorderLevel > 0 ? Math.min(100, (m.sellableQuantity / m.reorderLevel) * 100) : 0;
                    const meterColor = m.sellableQuantity === 0 ? 'red' : ratio < 50 ? 'orange' : 'green';

                    return (
                      <tr key={m._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{m.name}</div>
                          <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>{m.sku}</div>
                        </td>
                        <td className="num">
                          <strong style={{ color: m.sellableQuantity === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                            {m.sellableQuantity}
                          </strong>
                        </td>
                        <td className="num" style={{ color: 'var(--text-muted)' }}>
                          {m.reorderLevel}
                        </td>
                        <td style={{ minWidth: '90px' }}>
                          <div className="stock-meter">
                            <div className={`stock-meter-fill ${meterColor}`} style={{ width: `${ratio}%` }} />
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            status={m.sellableQuantity === 0 ? 'out' : 'low'}
                            label={m.sellableQuantity === 0 ? 'Stockout' : 'Below Min'}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Expiry Alerts Panel */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.15rem',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.12rem' }}>FEFO Expiry Warnings</h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Batches expiring soon or quarantined server-side
              </div>
            </div>
            <Link to="/inventory" className="btn btn-secondary btn-sm">
              <span>Inspect Batches</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {!alerts?.nearExpiryBatches?.length && !alerts?.expiredBatches?.length ? (
            <EmptyState
              title="No expiry alerts"
              description="No batches on hand are expired or within the near-expiry window (30 days)."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medicine / Batch</th>
                    <th>Expiry Date</th>
                    <th className="num">On Hand</th>
                    <th>Risk State</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.expiredBatches.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{b.medicineId?.name}</div>
                        <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                          Batch #{b.batchNumber}
                        </div>
                      </td>
                      <td className="mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                        {formatDate(b.expiryDate)}
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>{b.quantityOnHand}</td>
                      <td>
                        <StatusBadge status="expired" label="EXPIRED (Blocked)" />
                      </td>
                    </tr>
                  ))}
                  {alerts.nearExpiryBatches.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{b.medicineId?.name}</div>
                        <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                          Batch #{b.batchNumber}
                        </div>
                      </td>
                      <td className="mono">{formatDate(b.expiryDate)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{b.quantityOnHand}</td>
                      <td>
                        <StatusBadge status="near_expiry" label={`${b.daysRemaining}d left`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
