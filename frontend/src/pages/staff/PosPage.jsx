import {
  Banknote,
  Check,
  CreditCard,
  IndianRupee,
  Minus,
  Pill,
  Plus,
  QrCode,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, buildQueryString, formatDate, formatMoney, generateIdempotencyKey } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { InvoiceModal } from '../../components/InvoiceModal.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export const PosPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [idemKey, setIdemKey] = useState(() => generateIdempotencyKey());

  useEffect(() => {
    apiRequest('/catalog/categories')
      .then((res) => setCategories(res.items || []))
      .catch(() => {});
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQueryString({
        search,
        categoryId: selectedCategory || undefined,
        includeBatches: 'true',
        limit: 40,
      });
      const res = await apiRequest(`/catalog/medicines${qs}`);
      setMedicines(res.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const addItem = (med) => {
    setError('');
    setSuccessMsg('');
    setCart((prev) => {
      const existing = prev.find((i) => i.medicineId === med._id);
      if (existing) {
        return prev.map((i) => (i.medicineId === med._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          medicineId: med._id,
          name: med.name,
          sku: med.sku,
          unitPrice: med.unitPrice,
          taxRatePct: med.taxRatePct,
          batches: med.batches || [],
          batchId: '',
          quantity: 1,
        },
      ];
    });
    setIdemKey(generateIdempotencyKey());
  };

  const updateLine = (medicineId, patch) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicineId !== medicineId) return item;
          const updated = { ...item, ...patch };
          if (patch.batchId !== undefined) {
            const chosen = item.batches.find((b) => b._id === patch.batchId);
            if (chosen) updated.unitPrice = chosen.salePrice;
          }
          return updated;
        })
        .filter((i) => i.quantity > 0)
    );
    setIdemKey(generateIdempotencyKey());
  };

  const summary = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const item of cart) {
      const sub = item.quantity * item.unitPrice;
      subtotal += sub;
      taxTotal += sub * (item.taxRatePct / 100);
    }
    const grandTotal = Math.max(0, subtotal + taxTotal - Number(discountTotal || 0));
    return { subtotal, taxTotal, grandTotal };
  }, [cart, discountTotal]);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiRequest('/sales', {
        method: 'POST',
        idempotencyKey: idemKey,
        body: {
          customerName,
          customerPhone,
          paymentMethod,
          discountTotal: Number(discountTotal || 0),
          notes,
          items: cart.map((c) => ({
            medicineId: c.medicineId,
            quantity: Number(c.quantity),
            ...(c.batchId ? { batchId: c.batchId } : {}),
          })),
        },
      });
      setInvoiceSale(res.data);
      setCart([]);
      setDiscountTotal(0);
      setNotes('');
      setIdemKey(generateIdempotencyKey());
      setSuccessMsg(`Invoice ${res.data.invoiceNumber} completed! Stock deducted via FEFO.`);
      loadCatalog();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Title */}
      <div className="page-header">
        <div>
          <h1 className="page-title">POS Counter Terminal</h1>
          <p className="page-subtitle">
            Dispense counter sales with automatic FEFO batch allocation or manual batch override. Expired stock is strictly blocked.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}

      <div className="pos-layout">
        {/* Left Side: Pharmaceutical Catalog */}
        <div className="card">
          <div className="toolbar" style={{ marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={17}
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
                style={{ paddingLeft: '2.4rem', paddingRight: search ? '2.2rem' : '1rem' }}
                placeholder="Search catalog by name, generic, or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 2,
                  }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Category Quick Pills */}
          <div className="category-pill-strip" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
            <button
              type="button"
              className={`category-pill ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              <span>All Products</span>
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                type="button"
                className={`category-pill ${selectedCategory === c._id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c._id)}
              >
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingSpinner label="Loading medicine catalog..." />
          ) : medicines.length === 0 ? (
            <EmptyState title="No medicines match your search" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medicine Description</th>
                    <th className="num">Sellable</th>
                    <th className="num">Unit Price</th>
                    <th>Next Expiry</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((m) => (
                    <tr key={m._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{m.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <span className="mono text-muted" style={{ fontSize: '0.74rem' }}>{m.sku}</span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>· {m.strength}</span>
                          {!m.isOtc && <StatusBadge status="info" label="Rx POS Only" />}
                        </div>
                      </td>
                      <td className="num">
                        <strong style={{ color: m.sellableQuantity === 0 ? 'var(--danger)' : 'var(--text)' }}>
                          {m.sellableQuantity}
                        </strong>
                        {m.expiredQuantity > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>
                            ({m.expiredQuantity} exp.)
                          </div>
                        )}
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>{formatMoney(m.unitPrice)}</td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(m.nextExpiryDate)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={m.sellableQuantity <= 0}
                          onClick={() => addItem(m)}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Current Register Bill */}
        <div className="card pos-cart-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ShoppingCart size={17} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Active Counter Cart</h2>
            </div>
            {cart.length > 0 && (
              <span className="badge badge-info">{cart.length} item(s)</span>
            )}
          </div>

          {cart.length === 0 ? (
            <EmptyState
              title="Cart is empty"
              description="Click '+ Add' on any item from the catalog to populate this transaction."
            />
          ) : (
            <form onSubmit={handleCheckout}>
              {/* Item Lines */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  marginBottom: '1.25rem',
                  paddingRight: '0.25rem',
                }}
              >
                {cart.map((item) => (
                  <div
                    key={item.medicineId}
                    style={{
                      padding: '0.85rem',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                          {item.name}
                        </div>
                        <div className="mono text-muted" style={{ fontSize: '0.74rem' }}>
                          {formatMoney(item.unitPrice)} each · {item.taxRatePct}% GST
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)' }}
                        onClick={() => updateLine(item.medicineId, { quantity: 0 })}
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="pos-cart-line-controls">
                      {/* Qty Stepper */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>Quantity</label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px 0 0 6px' }}
                            onClick={() => updateLine(item.medicineId, { quantity: Math.max(1, item.quantity - 1) })}
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            className="input num"
                            style={{
                              borderRadius: 0,
                              textAlign: 'center',
                              padding: '0.35rem',
                              borderLeft: 'none',
                              borderRight: 'none',
                            }}
                            value={item.quantity}
                            onChange={(e) =>
                              updateLine(item.medicineId, { quantity: Math.max(1, Number(e.target.value) || 1) })
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.5rem', borderRadius: '0 6px 6px 0' }}
                            onClick={() => updateLine(item.medicineId, { quantity: item.quantity + 1 })}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Batch Allocation Dropdown */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>FEFO Allocation</label>
                        <select
                          className="select"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.55rem' }}
                          value={item.batchId}
                          onChange={(e) => updateLine(item.medicineId, { batchId: e.target.value })}
                        >
                          <option value="">Auto FEFO (Earliest Non-Expired)</option>
                          {item.batches
                            .filter((b) => b.quantityOnHand > 0)
                            .map((b) => (
                              <option key={b._id} value={b._id}>
                                Batch #{b.batchNumber} (Qty: {b.quantityOnHand}, Exp: {formatDate(b.expiryDate)})
                                {b.isExpired ? ' [EXPIRED - BLOCKED]' : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer & Payment Inputs */}
              <div className="grid-2" style={{ gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="pos-customer">Customer Name</label>
                  <input
                    id="pos-customer"
                    className="input"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pos-phone">Customer Phone</label>
                  <input
                    id="pos-phone"
                    className="input"
                    placeholder="+91 98765 01000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Interactive Payment Tender Toggle */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Payment Method Tender</label>
                <div className="payment-tender-grid">
                  {[
                    { id: 'CASH', label: 'Cash Tender', icon: Banknote },
                    { id: 'CARD', label: 'RuPay / Card', icon: CreditCard },
                    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                  ].map((p) => {
                    const isSelected = paymentMethod === p.id;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id)}
                        style={{
                          padding: '0.6rem 0.4rem',
                          borderRadius: 'var(--radius)',
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--primary-subtle)' : '#ffffff',
                          color: isSelected ? 'var(--primary)' : 'var(--text)',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <Icon size={16} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid-2" style={{ gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="pos-discount">Discount (₹)</label>
                  <input
                    id="pos-discount"
                    type="number"
                    min={0}
                    step="0.01"
                    className="input num"
                    value={discountTotal}
                    onChange={(e) => setDiscountTotal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pos-notes">Prescription Ref</label>
                  <input
                    id="pos-notes"
                    className="input"
                    placeholder="Optional notes / Rx ID"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Price Calculation Card */}
              <div
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span className="mono">{formatMoney(summary.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                  <span>GST (CGST + SGST)</span>
                  <span className="mono">{formatMoney(summary.taxTotal)}</span>
                </div>
                {Number(discountTotal) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: 'var(--success)' }}>
                    <span>Discount</span>
                    <span className="mono">−{formatMoney(discountTotal)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    color: 'var(--text)',
                    paddingTop: '0.5rem',
                    marginTop: '0.4rem',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span>Grand Total</span>
                  <span className="mono" style={{ color: 'var(--primary)' }}>
                    {formatMoney(summary.grandTotal)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', gap: '0.65rem' }}
                disabled={submitting}
              >
                <Receipt size={18} />
                <span>{submitting ? 'Allocating & Charging...' : 'Complete POS Sale & Print'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {invoiceSale && <InvoiceModal sale={invoiceSale} onClose={() => setInvoiceSale(null)} />}
    </div>
  );
};
