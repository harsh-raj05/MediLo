import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileBarChart2,
  IndianRupee,
  Package,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, formatDate, formatMoney } from '../../api/client.js';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export const ReportsPage = () => {
  const [tab, setTab] = useState('reconciliation');
  const [recon, setRecon] = useState(null);
  const [salesRep, setSalesRep] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [expiry, setExpiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rRes, sRes, vRes, eRes] = await Promise.all([
        apiRequest('/reports/stock-reconciliation'),
        apiRequest('/reports/sales'),
        apiRequest('/reports/stock-valuation'),
        apiRequest('/reports/expiry'),
      ]);
      setRecon(rRes.data);
      setSalesRep(sRes.data);
      setValuation(vRes.data);
      setExpiry(eRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (loading) return <LoadingSpinner label="Generating executive pharmaceutical reports..." />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial, Valuation &amp; Reconciliation Reports</h1>
          <p className="page-subtitle">
            Audit-grade operational intelligence backed by immutable stock movement ledgers and physical batch counts.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadReports}>
          <RefreshCw size={15} /> Refresh Reports
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'reconciliation' ? 'active' : ''}`}
          onClick={() => setTab('reconciliation')}
        >
          Stock Reconciliation (Audit)
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'sales' ? 'active' : ''}`}
          onClick={() => setTab('sales')}
        >
          Sales &amp; Margin Analysis
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'valuation' ? 'active' : ''}`}
          onClick={() => setTab('valuation')}
        >
          Asset Stock Valuation
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'expiry' ? 'active' : ''}`}
          onClick={() => setTab('expiry')}
        >
          Expiry Horizon &amp; Risk
        </button>
      </div>

      {/* Tab 1: Reconciliation */}
      {tab === 'reconciliation' && recon && (
        <div className="card">
          {/* Reconciliation Status Card */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Physical Stock Ledger Reconciliation</h2>
                <span className={`badge ${recon.reconciled ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.82rem', padding: '0.25rem 0.65rem' }}>
                  {recon.reconciled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {recon.reconciled ? '0 Variance · Reconciled' : `Variance: ${recon.totals.variance}`}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Mathematical Proof: <code style={{ background: 'var(--surface-muted)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Opening + Purchases + Returns − Sales + Adj. In − Adj. Out = Actual Batch Qty</code>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU / Medicine</th>
                  <th className="num">Opening</th>
                  <th className="num">+ Inward</th>
                  <th className="num">+ Returns</th>
                  <th className="num">− Sales</th>
                  <th className="num">+ Adj In</th>
                  <th className="num">− Adj Out</th>
                  <th className="num">Expected</th>
                  <th className="num">Physical On Hand</th>
                  <th className="num">Variance</th>
                </tr>
              </thead>
              <tbody>
                {recon.items.map((row) => (
                  <tr key={row.medicineId}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{row.name}</div>
                      <div className="mono text-muted" style={{ fontSize: '0.74rem' }}>{row.sku}</div>
                    </td>
                    <td className="num">{row.openingStock}</td>
                    <td className="num" style={{ color: 'var(--success)' }}>+{row.purchases}</td>
                    <td className="num" style={{ color: 'var(--success)' }}>+{row.saleReturns}</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>−{row.sales}</td>
                    <td className="num" style={{ color: 'var(--success)' }}>+{row.adjustmentsIn}</td>
                    <td className="num" style={{ color: 'var(--danger)' }}>−{row.adjustmentsOut}</td>
                    <td className="num"><strong style={{ color: 'var(--text)' }}>{row.expectedClosingStock}</strong></td>
                    <td className="num"><strong style={{ color: 'var(--primary)' }}>{row.actualStockOnHand}</strong></td>
                    <td className="num">
                      <StatusBadge
                        status={row.variance === 0 ? 'active' : 'expired'}
                        label={row.variance === 0 ? '0 Var' : String(row.variance)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid var(--border)' }}>
                  <td>TOTAL AUDIT SUM</td>
                  <td className="num">{recon.totals.openingStock}</td>
                  <td className="num" style={{ color: 'var(--success)' }}>+{recon.totals.purchases}</td>
                  <td className="num" style={{ color: 'var(--success)' }}>+{recon.totals.saleReturns}</td>
                  <td className="num" style={{ color: 'var(--danger)' }}>−{recon.totals.sales}</td>
                  <td className="num" style={{ color: 'var(--success)' }}>+{recon.totals.adjustmentsIn}</td>
                  <td className="num" style={{ color: 'var(--danger)' }}>−{recon.totals.adjustmentsOut}</td>
                  <td className="num">{recon.totals.expectedClosingStock}</td>
                  <td className="num" style={{ color: 'var(--primary)' }}>{recon.totals.actualStockOnHand}</td>
                  <td className="num">
                    <span className={`badge ${recon.totals.variance === 0 ? 'badge-success' : 'badge-danger'}`}>
                      {recon.totals.variance}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sales & Margin */}
      {tab === 'sales' && salesRep && (
        <div>
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">Gross Sales (incl. GST)</span>
                <div className="stat-icon-disc teal">
                  <IndianRupee size={20} />
                </div>
              </div>
              <div className="stat-value">{formatMoney(salesRep.summary.grandTotal)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {salesRep.summary.invoiceCount} invoices issued
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-header">
                <span className="stat-label">Statutory GST Collected</span>
                <div className="stat-icon-disc teal">
                  <Package size={20} />
                </div>
              </div>
              <div className="stat-value">{formatMoney(salesRep.summary.taxTotal)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                CGST + SGST statutory output
              </div>
            </div>

            <div className="stat-card stat-danger">
              <div className="stat-header">
                <span className="stat-label">Returns Refunded</span>
                <div className="stat-icon-disc rose">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {formatMoney(salesRep.summary.returnsTotal)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {salesRep.summary.returnsCount} return transactions
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-header">
                <span className="stat-label">Gross Margin (Ex-GST)</span>
                <div className="stat-icon-disc emerald">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {formatMoney(salesRep.summary.grossProfit)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                COGS: {formatMoney(salesRep.summary.cogs)}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', marginBottom: '1rem' }}>
              Top Pharmaceutical Products by Revenue
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product SKU</th>
                    <th>Medicine Name</th>
                    <th className="num">Units Sold</th>
                    <th className="num">Revenue Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {salesRep.topMedicines.map((m) => (
                    <tr key={m.medicineId}>
                      <td className="mono text-muted">{m.sku}</td>
                      <td><strong style={{ color: 'var(--text)' }}>{m.medicineName}</strong></td>
                      <td className="num">{m.unitsSold}</td>
                      <td className="num"><strong style={{ color: 'var(--primary)' }}>{formatMoney(m.revenue)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Stock Valuation */}
      {tab === 'valuation' && valuation && (
        <div>
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">Sellable Cost Value</span>
                <div className="stat-icon-disc teal">
                  <Package size={20} />
                </div>
              </div>
              <div className="stat-value">{formatMoney(valuation.summary.sellableCostValue)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                At supplier acquisition cost
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-header">
                <span className="stat-label">Sellable Retail Value</span>
                <div className="stat-icon-disc teal">
                  <IndianRupee size={20} />
                </div>
              </div>
              <div className="stat-value">{formatMoney(valuation.summary.sellableRetailValue)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                At counter selling prices
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-header">
                <span className="stat-label">Projected Gross Margin</span>
                <div className="stat-icon-disc emerald">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {formatMoney(valuation.summary.potentialGrossMargin)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Unrealized asset profit
              </div>
            </div>

            <div className="stat-card stat-danger">
              <div className="stat-header">
                <span className="stat-label">Expired Stock Written Off</span>
                <div className="stat-icon-disc rose">
                  <AlertTriangle size={20} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {formatMoney(valuation.summary.expiredCostValue)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {valuation.summary.expiredUnits} expired units on hand
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', marginBottom: '1rem' }}>
              Valuation Breakdown by Catalog Product
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product SKU</th>
                    <th>Medicine Description</th>
                    <th className="num">Sellable Units</th>
                    <th className="num">Expired Units</th>
                    <th className="num">Inventory Cost</th>
                    <th className="num">Retail Valuation</th>
                  </tr>
                </thead>
                <tbody>
                  {valuation.items.map((item) => (
                    <tr key={item.medicineId}>
                      <td className="mono text-muted">{item.sku}</td>
                      <td><strong style={{ color: 'var(--text)' }}>{item.name}</strong></td>
                      <td className="num">{item.sellableUnits}</td>
                      <td className="num" style={{ color: item.expiredUnits > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {item.expiredUnits}
                      </td>
                      <td className="num">{formatMoney(item.costValue)}</td>
                      <td className="num"><strong style={{ color: 'var(--text)' }}>{formatMoney(item.retailValue)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Expiry Horizon */}
      {tab === 'expiry' && expiry && (
        <div className="grid-2">
          {/* Expired Stock */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--danger)' }}>
                  Expired Stock Still On Hand ({expiry.expired.length})
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Batches past expiry date — server-side blocked from POS and online checkout
                </div>
              </div>
            </div>

            {expiry.expired.length === 0 ? (
              <EmptyState title="No expired batches on hand" description="All current inventory is active and within expiry horizon." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Batch Code</th>
                      <th>Medicine Name</th>
                      <th>Expired On</th>
                      <th className="num">Units</th>
                      <th className="num">At-Risk Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiry.expired.map((b) => (
                      <tr key={b._id}>
                        <td className="mono"><strong>#{b.batchNumber}</strong></td>
                        <td>{b.medicine?.name}</td>
                        <td className="mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          {formatDate(b.expiryDate)}
                        </td>
                        <td className="num">{b.quantityOnHand}</td>
                        <td className="num" style={{ color: 'var(--danger)' }}>
                          <strong>{formatMoney(b.atRiskCostValue)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Near Expiry */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--warning)' }}>
                  Expiring Within {expiry.nearExpiryDays} Days ({expiry.withinNearWindow.length})
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Upcoming expiry horizon requiring FEFO priority dispensing
                </div>
              </div>
            </div>

            {expiry.withinNearWindow.length === 0 ? (
              <EmptyState title="No near-expiry batches" description="No batches are expiring within the next 30 days." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Batch Code</th>
                      <th>Medicine Name</th>
                      <th>Expiry Date</th>
                      <th className="num">Days Remaining</th>
                      <th className="num">On Hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiry.withinNearWindow.map((b) => (
                      <tr key={b._id}>
                        <td className="mono"><strong>#{b.batchNumber}</strong></td>
                        <td>{b.medicine?.name}</td>
                        <td className="mono">{formatDate(b.expiryDate)}</td>
                        <td className="num">
                          <span className="badge badge-warning">{b.daysRemaining}d left</span>
                        </td>
                        <td className="num"><strong>{b.quantityOnHand}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
