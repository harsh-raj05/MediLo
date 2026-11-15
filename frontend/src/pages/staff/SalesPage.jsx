import {
  Calendar,
  Eye,
  FileText,
  RotateCcw,
  Search,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, buildQueryString, formatDateTime, formatMoney, generateIdempotencyKey } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { InvoiceModal } from '../../components/InvoiceModal.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export const SalesPage = () => {
  const [tab, setTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [saleType, setSaleType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [invoiceSale, setInvoiceSale] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState('RESTOCKABLE');
  const [returnLines, setReturnLines] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString({ search, saleType, page, limit: 15 });
      const res = await apiRequest(`/sales${qs}`);
      setSales(res.items || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, saleType, page]);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/returns${buildQueryString({ page, limit: 15 })}`);
      setReturns(res.items || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (tab === 'sales') loadSales();
    else loadReturns();
  }, [tab, loadSales, loadReturns]);

  const openReturnModal = (sale) => {
    const lines = [];
    for (const si of sale.items) {
      for (const alloc of si.allocations) {
        const remaining = alloc.quantity - alloc.returnedQuantity;
        if (remaining > 0) {
          lines.push({
            medicineId: si.medicineId,
            medicineName: si.medicineName,
            batchId: alloc.batchId,
            batchNumber: alloc.batchNumber,
            maxReturnable: remaining,
            quantity: 0,
          });
        }
      }
    }
    setReturnLines(lines);
    setReturnReason('');
    setReturnCondition('RESTOCKABLE');
    setReturnTarget(sale);
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    const chosen = returnLines.filter((l) => Number(l.quantity) > 0);
    if (chosen.length === 0) {
      setError('Select at least 1 unit to return.');
      return;
    }
    setSubmittingReturn(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiRequest('/returns', {
        method: 'POST',
        idempotencyKey: generateIdempotencyKey(),
        body: {
          saleId: returnTarget._id,
          reason: returnReason,
          condition: returnCondition,
          items: chosen.map((c) => ({
            medicineId: c.medicineId,
            batchId: c.batchId,
            quantity: Number(c.quantity),
          })),
        },
      });
      setSuccessMsg(`Processed return ${res.data.returnNumber} for invoice ${returnTarget.invoiceNumber}.`);
      setReturnTarget(null);
      loadSales();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Transactions &amp; Returns</h1>
          <p className="page-subtitle">
            Audit-grade record of POS counter purchases and customer self-checkout orders with batch allocations.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'sales' ? 'active' : ''}`}
          onClick={() => {
            setTab('sales');
            setPage(1);
          }}
        >
          Completed Sales &amp; Orders
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'returns' ? 'active' : ''}`}
          onClick={() => {
            setTab('returns');
            setPage(1);
          }}
        >
          Customer Return Ledger
        </button>
      </div>

      {tab === 'sales' ? (
        <div className="card">
          <div className="toolbar">
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search
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
                className="input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="Search by invoice number or customer name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="select"
              style={{ width: '210px' }}
              value={saleType}
              onChange={(e) => {
                setSaleType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Channels</option>
              <option value="POS">POS Counter Sales</option>
              <option value="ONLINE_ORDER">Customer Online Orders</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading sales transactions..." />
          ) : sales.length === 0 ? (
            <EmptyState title="No transactions found" />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Sales Channel</th>
                      <th>Customer Name</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th className="num">GST Total</th>
                      <th className="num">Grand Total</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <span
                            className="mono"
                            style={{
                              fontWeight: 700,
                              color: 'var(--primary)',
                              background: 'var(--primary-subtle)',
                              border: '1px solid var(--primary-border)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {s.invoiceNumber}
                          </span>
                        </td>
                        <td>
                          <StatusBadge
                            status={s.saleType}
                            label={s.saleType === 'ONLINE_ORDER' ? 'Online OTC' : 'POS Counter'}
                          />
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text)' }}>{s.customerName}</strong>
                          {s.customerPhone && (
                            <div className="text-muted" style={{ fontSize: '0.74rem' }}>{s.customerPhone}</div>
                          )}
                        </td>
                        <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDateTime(s.createdAt)}
                        </td>
                        <td><StatusBadge status={s.status} /></td>
                        <td className="num">{formatMoney(s.taxTotal)}</td>
                        <td className="num">
                          <strong style={{ fontSize: '0.98rem', color: 'var(--text)' }}>
                            {formatMoney(s.grandTotal)}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setInvoiceSale(s)}
                            >
                              <Eye size={13} /> View Invoice
                            </button>
                            {s.status !== 'RETURNED' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => openReturnModal(s)}
                              >
                                <RotateCcw size={13} /> Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
            <LoadingSpinner label="Loading return records..." />
          ) : returns.length === 0 ? (
            <EmptyState
              title="No customer returns recorded"
              description="Batch returns processed against completed invoices will appear in this ledger."
            />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Return #</th>
                      <th>Original Invoice</th>
                      <th>Stock Condition</th>
                      <th>Audit Justification</th>
                      <th>Processed By</th>
                      <th className="num">Refund Total</th>
                      <th>Processed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <span
                            className="mono"
                            style={{
                              fontWeight: 700,
                              background: 'var(--surface-muted)',
                              border: '1px solid var(--border)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {r.returnNumber}
                          </span>
                        </td>
                        <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {r.invoiceNumber}
                        </td>
                        <td><StatusBadge status={r.condition} /></td>
                        <td style={{ maxWidth: '280px', fontSize: '0.84rem' }}>{r.reason}</td>
                        <td style={{ fontSize: '0.84rem' }}>{r.createdBy?.name || 'System Staff'}</td>
                        <td className="num">
                          <strong style={{ color: 'var(--danger)' }}>−{formatMoney(r.refundAmount)}</strong>
                        </td>
                        <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {formatDateTime(r.createdAt)}
                        </td>
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

      {/* Return Modal */}
      {returnTarget && (
        <Modal
          title={`Process Return · Invoice ${returnTarget.invoiceNumber}`}
          onClose={() => setReturnTarget(null)}
          maxWidth="700px"
        >
          <div
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              padding: '0.85rem',
              borderRadius: 'var(--radius)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}
          >
            <div>Customer: <strong>{returnTarget.customerName}</strong></div>
            <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
              Original Invoice Date: {formatDateTime(returnTarget.createdAt)} · Total: {formatMoney(returnTarget.grandTotal)}
            </div>
          </div>

          <form onSubmit={handleReturnSubmit}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.65rem' }}>
              Select Return Quantities per Allocated Batch:
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                maxHeight: '260px',
                overflowY: 'auto',
                marginBottom: '1.25rem',
              }}
            >
              {returnLines.map((line, idx) => (
                <div
                  key={`${line.batchId}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{line.medicineName}</div>
                    <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                      Batch #{line.batchNumber} · Maximum returnable: <strong>{line.maxReturnable}</strong> units
                    </div>
                  </div>

                  <div style={{ width: '110px' }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Return Qty</label>
                    <input
                      type="number"
                      min={0}
                      max={line.maxReturnable}
                      className="input num"
                      value={line.quantity}
                      onChange={(e) => {
                        const val = Math.min(line.maxReturnable, Math.max(0, Number(e.target.value) || 0));
                        setReturnLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, quantity: val } : l))
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Returned Stock Condition</label>
                <select
                  className="select"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                >
                  <option value="RESTOCKABLE">Restockable (Returned to Sellable Batch)</option>
                  <option value="DAMAGED">Damaged / Non-Restockable (Written Off)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mandatory Return Reason</label>
                <input
                  className="input"
                  required
                  minLength={5}
                  placeholder="e.g. Unopened customer return, wrong strength"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setReturnTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submittingReturn}>
                {submittingReturn ? 'Processing...' : 'Authorize Return & Issue Credit'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {invoiceSale && <InvoiceModal sale={invoiceSale} onClose={() => setInvoiceSale(null)} />}
    </div>
  );
};
