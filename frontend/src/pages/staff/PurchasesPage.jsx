import {
  Calendar,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, buildQueryString, formatDate, formatMoney, generateIdempotencyKey } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Pagination } from '../../components/Pagination.jsx';

const emptyLine = (medId = '') => ({
  medicineId: medId,
  batchNumber: '',
  expiryDate: '',
  quantity: 10,
  unitCost: 45.0,
  salePrice: 80.0,
});

export const PurchasesPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/purchases${buildQueryString({ page, limit: 15 })}`);
      setPurchases(res.items || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    Promise.all([apiRequest('/suppliers?limit=100'), apiRequest('/catalog/medicines?limit=100')])
      .then(([sRes, mRes]) => {
        setSuppliers(sRes.items || []);
        setMedicines(mRes.items || []);
        if (sRes.items?.[0]) setSupplierId(sRes.items[0]._id);
        if (mRes.items?.[0]) setLines([emptyLine(mRes.items[0]._id)]);
      })
      .catch(() => {});
  }, []);

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiRequest('/purchases', {
        method: 'POST',
        idempotencyKey: generateIdempotencyKey(),
        body: {
          supplierId,
          supplierInvoiceNumber,
          notes,
          items: lines.map((l) => ({
            ...l,
            quantity: Number(l.quantity),
            unitCost: Number(l.unitCost),
            salePrice: Number(l.salePrice),
          })),
        },
      });
      setShowModal(false);
      setSupplierInvoiceNumber('');
      setNotes('');
      setLines([emptyLine(medicines[0]?._id || '')]);
      setSuccessMsg(`Received purchase ${res.data.purchaseNumber} and created/updated batch inventory.`);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Supplier Purchases &amp; Inward GRN</h1>
          <p className="page-subtitle">
            Receive incoming vendor shipments into discrete batches with verified expiry dates and unit cost valuations.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Receive Stock Shipment (GRN)
        </button>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}

      <div className="card">
        {loading ? (
          <LoadingSpinner label="Loading purchase shipment records..." />
        ) : purchases.length === 0 ? (
          <EmptyState
            title="No inward shipments recorded"
            description="Click 'Receive Stock Shipment' to log your first supplier delivery and batch stock."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>GRN / PO Number</th>
                    <th>Supplier</th>
                    <th>Supplier Inv #</th>
                    <th>Date Received</th>
                    <th>Batches Created</th>
                    <th className="num">Shipment Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'var(--primary-subtle)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--primary-border)',
                          }}
                        >
                          {p.purchaseNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                          {p.supplierId?.name || 'Unknown Supplier'}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                          Code: {p.supplierId?.code || '—'}
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: '0.85rem' }}>
                        {p.supplierInvoiceNumber || '—'}
                      </td>
                      <td className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} style={{ opacity: 0.6 }} />
                          <span>{formatDate(p.purchaseDate)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {p.items.map((i, idx) => (
                            <div key={idx} style={{ fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 600 }}>{i.medicineName}</span> ·{' '}
                              <span className="mono" style={{ background: 'var(--surface-muted)', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                                #{i.batchNumber}
                              </span>{' '}
                              · <strong style={{ color: 'var(--success)' }}>+{i.quantity}</strong> u (Exp {formatDate(i.expiryDate)})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="num">
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text)' }}>
                          {formatMoney(p.totalCost)}
                        </strong>
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

      {/* Receive Purchase Modal */}
      {showModal && (
        <Modal
          title="Receive Stock Purchase (Goods Received Note)"
          onClose={() => setShowModal(false)}
          maxWidth="940px"
        >
          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Authorized Supplier / Vendor</label>
                <select
                  className="select"
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Supplier Invoice Reference Number</label>
                <input
                  className="input mono"
                  required
                  placeholder="e.g. INV-2026-8819"
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                Batch Receiving Lines ({lines.length})
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setLines((prev) => [...prev, emptyLine(medicines[0]?._id || '')])}
              >
                <Plus size={14} /> Add Line
              </button>
            </div>

            {/* Line Items Container */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                maxHeight: '360px',
                overflowY: 'auto',
                marginBottom: '1.25rem',
                paddingRight: '0.25rem',
              }}
            >
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div className="purchase-line-grid">
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Medicine</label>
                      <select
                        className="select"
                        value={line.medicineId}
                        onChange={(e) => updateLine(idx, { medicineId: e.target.value })}
                      >
                        {medicines.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Batch Number</label>
                      <input
                        className="input mono"
                        required
                        placeholder="B-2027-01"
                        value={line.batchNumber}
                        onChange={(e) => updateLine(idx, { batchNumber: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Expiry Date</label>
                      <input
                        type="date"
                        className="input"
                        required
                        value={line.expiryDate}
                        onChange={(e) => updateLine(idx, { expiryDate: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        className="input num"
                        required
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Unit Cost (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input num"
                        required
                        value={line.unitCost}
                        onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Sale Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input num"
                        required
                        value={line.salePrice}
                        onChange={(e) => updateLine(idx, { salePrice: e.target.value })}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.5rem', color: 'var(--danger)' }}
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                      title="Delete line"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Receiving Notes / Quality Inspection Log</label>
              <input
                className="input"
                placeholder="Optional delivery dock remarks, cold chain check, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Receiving & Creating Batches...' : 'Confirm & Commit Inward Stock'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
