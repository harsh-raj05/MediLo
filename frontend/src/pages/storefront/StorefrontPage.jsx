import {
  CheckCircle2,
  Eye,
  Heart,
  Info,
  Minus,
  PackageCheck,
  Pill,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, buildQueryString, formatMoney, generateIdempotencyKey } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { InvoiceModal } from '../../components/InvoiceModal.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { MediloBrand } from '../../components/MediloBrand.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export const StorefrontPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [quickViewMed, setQuickViewMed] = useState(null);
  const [idemKey, setIdemKey] = useState(() => generateIdempotencyKey());

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString({ search, categoryId, isOtc: 'true', page, limit: 12 });
      const res = await apiRequest(`/catalog/medicines${qs}`);
      setMedicines(res.items || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, page]);

  useEffect(() => {
    apiRequest('/catalog/categories')
      .then((res) => setCategories(res.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const addToCart = (med) => {
    setSuccessMsg('');
    setError('');
    setCart((prev) => {
      const existing = prev.find((c) => c.medicineId === med._id);
      if (existing) {
        if (existing.quantity >= med.sellableQuantity) return prev;
        return prev.map((c) => (c.medicineId === med._id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          medicineId: med._id,
          name: med.name,
          sku: med.sku,
          unitPrice: med.unitPrice,
          taxRatePct: med.taxRatePct,
          maxStock: med.sellableQuantity,
          quantity: 1,
        },
      ];
    });
    setIdemKey(generateIdempotencyKey());
  };

  const updateCartQty = (medicineId, nextQty) => {
    setCart((prev) =>
      prev
        .map((c) => (c.medicineId === medicineId ? { ...c, quantity: Math.min(Math.max(0, nextQty), c.maxStock) } : c))
        .filter((c) => c.quantity > 0)
    );
    setIdemKey(generateIdempotencyKey());
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const item of cart) {
      const lineSub = item.quantity * item.unitPrice;
      const lineTax = lineSub * (item.taxRatePct / 100);
      subtotal += lineSub;
      tax += lineTax;
    }
    return { subtotal, tax, grandTotal: subtotal + tax };
  }, [cart]);

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
          paymentMethod: 'ONLINE',
          notes,
          items: cart.map((c) => ({ medicineId: c.medicineId, quantity: c.quantity })),
        },
      });
      setInvoiceSale(res.data);
      setCart([]);
      setNotes('');
      setIdemKey(generateIdempotencyKey());
      setSuccessMsg(`Order ${res.data.invoiceNumber} successfully placed! Stock automatically fulfilled via FEFO batch stock.`);
      fetchCatalog();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Visual Hero Banner with Background Image */}
      <div
        className="hero-banner"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=1600&q=80')`,
        }}
      >
        <div className="hero-banner-overlay" />
        <div className="hero-banner-content">
          <div style={{ marginBottom: '1.25rem' }}>
            <MediloBrand
              iconSize={42}
              textSize="lg"
              theme="dark"
              subtitle="Direct-to-Patient Pharmacy Portal"
              badge="OTC STORE"
            />
          </div>

          <div className="hero-badge">
            <Sparkles size={13} />
            <span>Verified OTC Formulary · Batch-Tracked Quality</span>
          </div>

          <h1
            style={{
              margin: '0 0 0.5rem',
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}
          >
            Digital Pharmacy &amp; Wellness Essentials
          </h1>

          <p
            style={{
              margin: '0 0 1.5rem',
              color: '#cbd5e1',
              fontSize: '0.96rem',
              maxWidth: '620px',
              lineHeight: 1.5,
            }}
          >
            Browse certified non-prescription OTC healthcare items. All orders are automatically allocated from the earliest-expiring active batches via First-Expiry-First-Out (FEFO) protocols.
          </p>

          {/* Quick Search Toolbar Inside Hero */}
          <div style={{ maxWidth: '640px', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
              <input
                className="input"
                style={{
                  paddingLeft: '2.6rem',
                  paddingRight: search ? '2.5rem' : '1rem',
                  borderRadius: 'var(--radius-full)',
                  height: '46px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
                  fontSize: '0.95rem',
                }}
                placeholder="Search OTC medicines by brand, generic, or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: 4,
                  }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}

      {/* Interactive Category Filter Pills */}
      <div className="category-pill-strip">
        <button
          type="button"
          className={`category-pill ${categoryId === '' ? 'active' : ''}`}
          onClick={() => {
            setCategoryId('');
            setPage(1);
          }}
        >
          <span>All Products</span>
        </button>

        {categories.map((c) => {
          const isActive = categoryId === c._id;
          return (
            <button
              key={c._id}
              type="button"
              className={`category-pill ${isActive ? 'active' : ''}`}
              onClick={() => {
                setCategoryId(c._id);
                setPage(1);
              }}
            >
              <Pill size={13} style={{ opacity: isActive ? 1 : 0.7 }} />
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Catalog + Cart */}
      <div className="pos-layout">
        {/* Left: Product Catalog Grid */}
        <div className="card">
          {loading ? (
            <LoadingSpinner label="Loading OTC items from verified batches..." />
          ) : medicines.length === 0 ? (
            <EmptyState title="No OTC items match your search" />
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1.15rem',
                }}
              >
                {medicines.map((med) => (
                  <div
                    key={med._id}
                    className="card-interactive"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)',
                      position: 'relative',
                    }}
                  >
                    <div>
                      {/* Top Badges & Quick View Trigger */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.4rem',
                          marginBottom: '0.65rem',
                        }}
                      >
                        <span className="mono text-muted" style={{ fontSize: '0.72rem' }}>
                          {med.sku}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setQuickViewMed(med)}
                            title="Quick view product specs"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-tertiary)',
                              padding: 2,
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          {med.isOutOfStock ? (
                            <StatusBadge status="out" label="Stockout" />
                          ) : med.isLowStock ? (
                            <StatusBadge status="low" label={`${med.sellableQuantity} left`} />
                          ) : (
                            <StatusBadge status="active" label={`${med.sellableQuantity} in stock`} />
                          )}
                        </div>
                      </div>

                      <h3
                        style={{
                          margin: '0 0 0.35rem',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--text)',
                          lineHeight: 1.3,
                        }}
                      >
                        {med.name}
                      </h3>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        {med.genericName} · {med.strength}
                      </div>

                      <div
                        style={{
                          display: 'inline-block',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'var(--primary)',
                          background: 'var(--primary-subtle)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--primary-border)',
                        }}
                      >
                        {med.category?.name || 'OTC'} · {med.dosageForm}
                      </div>
                    </div>

                    {/* Price and Add to Cart */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '1.25rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <div
                          className="mono"
                          style={{
                            fontWeight: 800,
                            fontSize: '1.2rem',
                            color: 'var(--text)',
                          }}
                        >
                          {formatMoney(med.unitPrice)}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                          +{med.taxRatePct}% GST
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={med.sellableQuantity <= 0}
                        onClick={() => addToCart(med)}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>

        {/* Right: Cart & Checkout Panel */}
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
                <ShoppingBag size={17} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Your Cart</h2>
            </div>
            {cart.length > 0 && (
              <span className="badge badge-info">{cart.length} item(s)</span>
            )}
          </div>

          {cart.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Browse the OTC medicines on the left and add items to place a self-checkout order."
            />
          ) : (
            <form onSubmit={handleCheckout}>
              {/* Cart Items List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  marginBottom: '1.25rem',
                  paddingRight: '0.25rem',
                }}
              >
                {cart.map((item) => (
                  <div
                    key={item.medicineId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                        {item.name}
                      </div>
                      <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                        {formatMoney(item.unitPrice)} each · +{item.taxRatePct}% GST
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.45rem' }}
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => updateCartQty(item.medicineId, item.quantity - 1)}
                      >
                        <Minus size={12} />
                      </button>

                      <span
                        className="mono"
                        style={{
                          minWidth: 26,
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.45rem' }}
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.quantity >= item.maxStock}
                        onClick={() => updateCartQty(item.medicineId, item.quantity + 1)}
                      >
                        <Plus size={12} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)' }}
                        aria-label={`Remove ${item.name}`}
                        onClick={() => updateCartQty(item.medicineId, 0)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery / Pickup Notes */}
              <div className="form-group">
                <label className="form-label" htmlFor="order-notes">
                  Order &amp; Delivery Instructions (Optional)
                </label>
                <input
                  id="order-notes"
                  className="input"
                  placeholder="e.g. Leave with building concierge or pick up at counter"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
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
                  <span className="mono">{formatMoney(totals.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                  <span>Estimated GST (CGST+SGST)</span>
                  <span className="mono">{formatMoney(totals.tax)}</span>
                </div>
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
                    {formatMoney(totals.grandTotal)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                <Receipt size={18} />
                <span>{submitting ? 'Placing Order...' : 'Place Order & Get GST Invoice'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Interactive Medicine Quick View Modal */}
      {quickViewMed && (
        <Modal
          title={`Clinical Product Details · ${quickViewMed.name}`}
          onClose={() => setQuickViewMed(null)}
          maxWidth="560px"
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <span className="mono text-muted" style={{ fontSize: '0.85rem' }}>
                SKU: {quickViewMed.sku}
              </span>
              <StatusBadge status={quickViewMed.isOutOfStock ? 'out' : quickViewMed.isLowStock ? 'low' : 'active'} />
              <span className="badge badge-info">OTC Approved</span>
            </div>

            <div
              style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.85rem',
                fontSize: '0.88rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  Active Molecule / Generic
                </div>
                <strong>{quickViewMed.genericName}</strong>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  Strength &amp; Packaging
                </div>
                <strong>{quickViewMed.strength}</strong>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  Dosage Form &amp; Route
                </div>
                <strong>{quickViewMed.dosageForm}</strong>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  Manufacturer
                </div>
                <strong>{quickViewMed.manufacturer || 'Certified Laboratories'}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {quickViewMed.description || 'Verified pharmaceutical preparation formulated under strict quality compliance. Shelf-stable at controlled room temperature.'}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div>
                <div className="mono" style={{ fontWeight: 800, fontSize: '1.35rem', color: 'var(--text)' }}>
                  {formatMoney(quickViewMed.unitPrice)}
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  +{quickViewMed.taxRatePct}% GST · {quickViewMed.sellableQuantity} units available
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={quickViewMed.sellableQuantity <= 0}
                onClick={() => {
                  addToCart(quickViewMed);
                  setQuickViewMed(null);
                }}
              >
                <Plus size={16} /> Add to Order
              </button>
            </div>
          </div>
        </Modal>
      )}

      {invoiceSale && <InvoiceModal sale={invoiceSale} onClose={() => setInvoiceSale(null)} />}
    </div>
  );
};
