import {
  AlertTriangle,
  Calendar,
  Layers,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, buildQueryString, formatDate, formatMoney, generateIdempotencyKey } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Cream',
  'Drops',
  'Inhaler',
  'Injection',
  'Ointment',
  'Powder',
  'Patch',
  'Medical Supply',
];

export const InventoryPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('batches');

  // Batches state
  const [batches, setBatches] = useState([]);
  const [batchPagination, setBatchPagination] = useState(null);
  const [batchSearch, setBatchSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [batchPage, setBatchPage] = useState(1);

  // Medicines state
  const [medicines, setMedicines] = useState([]);
  const [medPagination, setMedPagination] = useState(null);
  const [medSearch, setMedSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [medPage, setMedPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Stock adjustment modal
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ delta: -1, adjustmentType: 'DAMAGE', reason: '' });
  const [adjusting, setAdjusting] = useState(false);

  // Create medicine modal
  const [showNewMed, setShowNewMed] = useState(false);
  const [medForm, setMedForm] = useState({
    sku: '',
    name: '',
    genericName: '',
    categoryId: '',
    primarySupplierId: '',
    dosageForm: 'Tablet',
    strength: '',
    manufacturer: '',
    unit: 'strip',
    reorderLevel: 15,
    taxRatePct: 5,
    isOtc: true,
    description: '',
  });

  useEffect(() => {
    Promise.all([apiRequest('/catalog/categories'), apiRequest('/suppliers?limit=100')])
      .then(([cRes, sRes]) => {
        setCategories(cRes.items || []);
        setSuppliers(sRes.items || []);
        if (cRes.items?.[0]) {
          setMedForm((f) => ({ ...f, categoryId: cRes.items[0]._id }));
        }
      })
      .catch(() => {});
  }, []);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString({ search: batchSearch, expiryFilter, page: batchPage, limit: 15 });
      const res = await apiRequest(`/inventory/batches${qs}`);
      setBatches(res.items || []);
      setBatchPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [batchSearch, expiryFilter, batchPage]);

  const loadMedicines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString({ search: medSearch, stockStatus, page: medPage, limit: 15 });
      const res = await apiRequest(`/catalog/medicines${qs}`);
      setMedicines(res.items || []);
      setMedPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [medSearch, stockStatus, medPage]);

  useEffect(() => {
    if (tab === 'batches') loadBatches();
    else loadMedicines();
  }, [tab, loadBatches, loadMedicines]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setAdjusting(true);
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest('/inventory/adjustments', {
        method: 'POST',
        idempotencyKey: generateIdempotencyKey(),
        body: {
          batchId: adjustTarget._id,
          delta: Number(adjustForm.delta),
          adjustmentType: adjustForm.adjustmentType,
          reason: adjustForm.reason,
        },
      });
      setSuccessMsg(`Adjusted batch ${adjustTarget.batchNumber} successfully.`);
      setAdjustTarget(null);
      setAdjustForm({ delta: -1, adjustmentType: 'DAMAGE', reason: '' });
      loadBatches();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdjusting(false);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest('/catalog/medicines', {
        method: 'POST',
        body: {
          ...medForm,
          primarySupplierId: medForm.primarySupplierId || null,
          reorderLevel: Number(medForm.reorderLevel),
          taxRatePct: Number(medForm.taxRatePct),
        },
      });
      setShowNewMed(false);
      setSuccessMsg(`Created medicine ${medForm.name}. Receive a purchase to add initial batch stock.`);
      setMedForm({ ...medForm, sku: '', name: '', genericName: '', strength: '', manufacturer: '', description: '' });
      loadMedicines();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pharmaceutical Batch Inventory</h1>
          <p className="page-subtitle">
            Every inventory unit is strictly bound to its batch number, expiry date, purchase cost, and sale price.
          </p>
        </div>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setShowNewMed(true)}>
            <Plus size={16} /> New Medicine
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}

      {/* Segmented Control Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'batches' ? 'active' : ''}`}
          onClick={() => setTab('batches')}
        >
          Batch-Level Stock Ledger
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'medicines' ? 'active' : ''}`}
          onClick={() => setTab('medicines')}
        >
          Medicine Catalog Summary
        </button>
      </div>

      {tab === 'batches' ? (
        <div className="card">
          {/* Filter Toolbar */}
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
                placeholder="Search batch number, medicine name, or SKU..."
                value={batchSearch}
                onChange={(e) => {
                  setBatchSearch(e.target.value);
                  setBatchPage(1);
                }}
              />
            </div>
            <select
              className="select"
              style={{ width: '220px' }}
              value={expiryFilter}
              onChange={(e) => {
                setExpiryFilter(e.target.value);
                setBatchPage(1);
              }}
            >
              <option value="">All Batches</option>
              <option value="sellable">Sellable (Active &amp; Non-Expired)</option>
              <option value="near_expiry">Near Expiry (&le; 30 days)</option>
              <option value="expired">Expired (Blocked)</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner label="Querying batch inventory..." />
          ) : batches.length === 0 ? (
            <EmptyState title="No batches found matching criteria" />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Batch Code</th>
                      <th>Medicine &amp; SKU</th>
                      <th>Supplier</th>
                      <th>Expiry Horizon</th>
                      <th className="num">Qty On Hand</th>
                      <th className="num">Unit Cost</th>
                      <th className="num">Sale Price</th>
                      <th>Batch Status</th>
                      <th style={{ textAlign: 'right' }}>Adjustment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b._id}>
                        <td>
                          <span
                            className="mono"
                            style={{
                              background: 'var(--surface-muted)',
                              border: '1px solid var(--border)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                            }}
                          >
                            #{b.batchNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{b.medicine?.name}</div>
                          <div className="mono text-muted" style={{ fontSize: '0.74rem' }}>{b.medicine?.sku}</div>
                        </td>
                        <td style={{ fontSize: '0.84rem' }}>{b.supplier?.name || '—'}</td>
                        <td className="mono" style={{ fontSize: '0.84rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={13} style={{ opacity: 0.6 }} />
                            <span>{formatDate(b.expiryDate)}</span>
                          </div>
                        </td>
                        <td className="num">
                          <strong style={{ fontSize: '0.95rem', color: b.quantityOnHand === 0 ? 'var(--text-tertiary)' : 'var(--text)' }}>
                            {b.quantityOnHand}
                          </strong>
                        </td>
                        <td className="num">{formatMoney(b.purchasePrice)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{formatMoney(b.salePrice)}</td>
                        <td>
                          {b.isExpired ? (
                            <StatusBadge status="expired" label="Expired" />
                          ) : b.isNearExpiry ? (
                            <StatusBadge status="near_expiry" label="Near Expiry" />
                          ) : (
                            <StatusBadge status={b.status} />
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setAdjustTarget(b);
                              setAdjustForm({
                                delta: -1,
                                adjustmentType: b.isExpired ? 'EXPIRED_DISPOSAL' : 'DAMAGE',
                                reason: '',
                              });
                            }}
                          >
                            <SlidersHorizontal size={13} /> Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={batchPagination} onPageChange={setBatchPage} />
            </>
          )}
        </div>
      ) : (
        <div className="card">
          {/* Catalog Toolbar */}
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
                placeholder="Search catalog medicines..."
                value={medSearch}
                onChange={(e) => {
                  setMedSearch(e.target.value);
                  setMedPage(1);
                }}
              />
            </div>
            <select
              className="select"
              style={{ width: '220px' }}
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value);
                setMedPage(1);
              }}
            >
              <option value="">All Stock Levels</option>
              <option value="low">Low Stock (&le; Reorder Level)</option>
              <option value="out">Stockout (0 Qty)</option>
              <option value="near_expiry">Has Near-Expiry Batch</option>
            </select>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading catalog medicines..." />
          ) : medicines.length === 0 ? (
            <EmptyState title="No medicines match this filter" />
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU / Brand Name</th>
                      <th>Category</th>
                      <th>Form &amp; Strength</th>
                      <th className="num">Sellable Stock</th>
                      <th className="num">Expired Qty</th>
                      <th className="num">Reorder Min</th>
                      <th className="num">GST %</th>
                      <th>Sales Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{m.name}</div>
                          <div className="mono text-muted" style={{ fontSize: '0.74rem' }}>
                            {m.sku} · {m.genericName}
                          </div>
                        </td>
                        <td>{m.category?.name || 'General'}</td>
                        <td>{m.dosageForm} · {m.strength}</td>
                        <td className="num">
                          <strong style={{ fontSize: '0.95rem' }}>{m.sellableQuantity}</strong>{' '}
                          {m.isLowStock && <StatusBadge status="low" label="Low" />}
                        </td>
                        <td className="num" style={{ color: m.expiredQuantity > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {m.expiredQuantity || 0}
                        </td>
                        <td className="num" style={{ color: 'var(--text-muted)' }}>{m.reorderLevel}</td>
                        <td className="num">{m.taxRatePct}%</td>
                        <td>
                          <StatusBadge status="info" label={m.isOtc ? 'OTC + POS' : 'Rx POS Only'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={medPagination} onPageChange={setMedPage} />
            </>
          )}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustTarget && (
        <Modal
          title={`Adjust Batch Stock · #${adjustTarget.batchNumber}`}
          onClose={() => setAdjustTarget(null)}
          maxWidth="540px"
        >
          <div
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{adjustTarget.medicine?.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Current Batch Quantity On Hand: <strong style={{ color: 'var(--text)' }}>{adjustTarget.quantityOnHand}</strong> units
            </div>
          </div>

          <form onSubmit={handleAdjustSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="adj-type">
                Adjustment Reason Classification
              </label>
              <select
                id="adj-type"
                className="select"
                value={adjustForm.adjustmentType}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })}
              >
                <option value="DAMAGE">Damage / Breakage</option>
                <option value="EXPIRED_DISPOSAL">Expired Batch Disposal</option>
                <option value="AUDIT_CORRECTION">Physical Audit Reconciliation Correction</option>
                <option value="QUARANTINE">Quarantine Hold</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adj-delta">
                Quantity Delta (negative to deduct, positive to add)
              </label>
              <input
                id="adj-delta"
                type="number"
                className="input num"
                required
                value={adjustForm.delta}
                onChange={(e) => setAdjustForm({ ...adjustForm, delta: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="adj-reason">
                Mandatory Audit Justification (minimum 5 characters)
              </label>
              <textarea
                id="adj-reason"
                className="textarea"
                rows={3}
                required
                minLength={5}
                placeholder="Explain why this inventory adjustment is necessary for compliance..."
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdjustTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={adjusting}>
                {adjusting ? 'Submitting...' : 'Confirm Stock Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Medicine Modal */}
      {showNewMed && (
        <Modal title="Create Pharmaceutical Product" onClose={() => setShowNewMed(false)} maxWidth="680px">
          <form onSubmit={handleCreateMedicine}>
            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">SKU Identifier</label>
                <input
                  className="input mono"
                  required
                  placeholder="MED-009"
                  value={medForm.sku}
                  onChange={(e) => setMedForm({ ...medForm, sku: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Paracetamol Forte"
                  value={medForm.name}
                  onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Generic / Active Molecule</label>
                <input
                  className="input"
                  required
                  placeholder="Acetaminophen"
                  value={medForm.genericName}
                  onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Therapeutic Category</label>
                <select
                  className="select"
                  value={medForm.categoryId}
                  onChange={(e) => setMedForm({ ...medForm, categoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dosage Form</label>
                <select
                  className="select"
                  value={medForm.dosageForm}
                  onChange={(e) => setMedForm({ ...medForm, dosageForm: e.target.value })}
                >
                  {DOSAGE_FORMS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Strength &amp; Packaging</label>
                <input
                  className="input"
                  required
                  placeholder="500mg, 10 tablets/strip"
                  value={medForm.strength}
                  onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input
                  className="input"
                  required
                  placeholder="PharmaCorp Labs"
                  value={medForm.manufacturer}
                  onChange={(e) => setMedForm({ ...medForm, manufacturer: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Primary Distributor</label>
                <select
                  className="select"
                  value={medForm.primarySupplierId}
                  onChange={(e) => setMedForm({ ...medForm, primarySupplierId: e.target.value })}
                >
                  <option value="">None Designated</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reorder Level (Min Qty)</label>
                <input
                  type="number"
                  min={0}
                  className="input num"
                  value={medForm.reorderLevel}
                  onChange={(e) => setMedForm({ ...medForm, reorderLevel: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">GST Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step="0.5"
                  className="input num"
                  value={medForm.taxRatePct}
                  onChange={(e) => setMedForm({ ...medForm, taxRatePct: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.75rem',
                  background: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  style={{ width: 17, height: 17, accentColor: 'var(--primary)' }}
                  checked={medForm.isOtc}
                  onChange={(e) => setMedForm({ ...medForm, isOtc: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Permit Customer Online Self-Checkout (OTC)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    If unchecked, item requires in-person prescription validation via Pharmacist POS only.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowNewMed(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Product Definition
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
