import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  History,
  Lock,
  Search,
  Shield,
  Sliders,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, buildQueryString, formatDateTime } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const AuditPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('movements');
  const [movements, setMovements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [movementType, setMovementType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'movements') {
        const qs = buildQueryString({ movementType, page, limit: 20 });
        const res = await apiRequest(`/inventory/movements${qs}`);
        setMovements(res.items || []);
        setPagination(res.pagination);
      } else {
        const qs = buildQueryString({ page, limit: 20 });
        const res = await apiRequest(`/reports/audit-logs${qs}`);
        setAuditLogs(res.items || []);
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, movementType, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Immutable Stock Ledger &amp; Security Audits</h1>
          <p className="page-subtitle">
            Cryptographically chronological log of all stock deductions, batch receipts, returns, adjustments, and material events.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'movements' ? 'active' : ''}`}
          onClick={() => {
            setTab('movements');
            setPage(1);
          }}
        >
          Stock Movement Ledger
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`tab-btn ${tab === 'audit' ? 'active' : ''}`}
            onClick={() => {
              setTab('audit');
              setPage(1);
            }}
          >
            System Security Audit Trail (Admin)
          </button>
        )}
      </div>

      {tab === 'movements' ? (
        <div className="card">
          <div className="toolbar">
            <select
              className="select"
              style={{ width: '240px' }}
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Movement Types</option>
              <option value="OPENING">Initial Seed Opening (+)</option>
              <option value="PURCHASE">Supplier Purchase Delivery (+)</option>
              <option value="SALE">POS / Online Sale Deduction (−)</option>
              <option value="SALE_RETURN">Customer Sale Return (+)</option>
              <option value="ADJUSTMENT_IN">Stock Adjustment In (+)</option>
              <option value="ADJUSTMENT_OUT">Stock Adjustment Out (−)</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner label="Querying immutable movement ledger..." />
          ) : movements.length === 0 ? (
            <EmptyState title="No movements match this filter" />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Movement Classification</th>
                      <th>Medicine &amp; Batch</th>
                      <th className="num">Delta Qty</th>
                      <th className="num">Balance Shift</th>
                      <th>Reference Code</th>
                      <th>Audit Justification</th>
                      <th>Authorized By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const isPositive = m.quantityDelta >= 0;
                      return (
                        <tr key={m._id}>
                          <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {formatDateTime(m.createdAt)}
                          </td>
                          <td>
                            <StatusBadge status="info" label={m.movementType} />
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {m.medicineId?.name || 'Item'}
                            </div>
                            <div className="mono text-muted" style={{ fontSize: '0.74rem' }}>
                              Batch #{m.batchNumber}
                            </div>
                          </td>
                          <td className="num">
                            <span
                              className="mono"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                color: isPositive ? 'var(--success)' : 'var(--danger)',
                                background: isPositive ? 'var(--success-soft)' : 'var(--danger-soft)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                              {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                            </span>
                          </td>
                          <td className="num mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {m.balanceBefore} &rarr; <strong style={{ color: 'var(--text)' }}>{m.balanceAfter}</strong>
                          </td>
                          <td>
                            <span
                              className="mono"
                              style={{
                                fontWeight: 700,
                                background: 'var(--surface-muted)',
                                border: '1px solid var(--border)',
                                padding: '0.2rem 0.45rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.78rem',
                              }}
                            >
                              {m.referenceCode}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                            {m.reason || '—'}
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            <strong>{m.performedBy?.name || 'System Auto-Engine'}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      ) : (
        <div className="card">
          {loading ? (
            <LoadingSpinner label="Loading security audit log..." />
          ) : auditLogs.length === 0 ? (
            <EmptyState title="No system audit events recorded" />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor Identity</th>
                      <th>Event Action</th>
                      <th>Entity Type</th>
                      <th>Event Summary &amp; Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((a) => (
                      <tr key={a._id}>
                        <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDateTime(a.createdAt)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{a.actorEmail}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                            {a.actorRole}
                          </div>
                        </td>
                        <td>
                          <span
                            className="mono"
                            style={{
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              background: 'var(--surface-muted)',
                              border: '1px solid var(--border)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {a.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.84rem' }}>{a.entityType}</td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--text)' }}>{a.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      )}
    </div>
  );
};
