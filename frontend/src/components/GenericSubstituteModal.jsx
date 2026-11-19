import { ArrowRight, Check, CheckCircle2, ChevronRight, IndianRupee, Pill, Sparkles, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';
import { formatDate, formatMoney } from '../api/client.js';
import { Modal } from './Modal.jsx';
import { StatusBadge } from './StatusBadge.jsx';

export const GenericSubstituteModal = ({
  targetMedicine,
  catalog = [],
  onClose,
  onSelectSubstitute,
}) => {
  if (!targetMedicine) return null;

  // Find alternatives that share the same category or generic name
  const substitutes = useMemo(() => {
    return catalog.filter((m) => {
      if (m._id === targetMedicine._id) return false;
      const sameCategory = m.categoryId === targetMedicine.categoryId || m.category?._id === targetMedicine.categoryId;
      const sameGeneric =
        (m.genericName || '').toLowerCase().trim() === (targetMedicine.genericName || '').toLowerCase().trim();
      return sameCategory || sameGeneric;
    });
  }, [catalog, targetMedicine]);

  return (
    <Modal
      title={`Generic Substitutes · ${targetMedicine.name}`}
      onClose={onClose}
      maxWidth="680px"
    >
      <div style={{ padding: '0.25rem' }}>
        {/* Current Medicine Callout */}
        <div
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
            Prescribed / Selected Product
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
            <div>
              <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{targetMedicine.name}</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Active Salt: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{targetMedicine.genericName}</span> · {targetMedicine.strength}
              </div>
            </div>
            <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              {formatMoney(targetMedicine.unitPrice)}
            </div>
          </div>
        </div>

        {/* Alternatives Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span>In-Stock Bioequivalent &amp; Category Alternatives ({substitutes.length})</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Same therapeutic outcome</span>
        </div>

        {substitutes.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              background: 'var(--surface-subtle)',
              borderRadius: 'var(--radius)',
              border: '1px dashed var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.88rem',
            }}
          >
            No alternative brands currently registered for this therapeutic category.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {substitutes.map((sub) => {
              const priceDiff = targetMedicine.unitPrice - sub.unitPrice;
              const percentSavings = targetMedicine.unitPrice > 0 ? Math.round((priceDiff / targetMedicine.unitPrice) * 100) : 0;
              const isCheaper = priceDiff > 0;

              return (
                <div
                  key={sub._id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all var(--transition-fast)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text)' }}>{sub.name}</strong>
                      {isCheaper && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--success-soft)',
                            color: 'var(--success)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <TrendingDown size={11} /> Save {percentSavings}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {sub.genericName} · {sub.strength}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem', fontSize: '0.75rem' }}>
                      <span className="mono" style={{ color: sub.sellableQuantity > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {sub.sellableQuantity} units in stock
                      </span>
                      <span>·</span>
                      <span className="mono text-muted">Exp: {formatDate(sub.nextExpiryDate)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                      {formatMoney(sub.unitPrice)}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '0.4rem' }}
                      disabled={sub.sellableQuantity <= 0}
                      onClick={() => onSelectSubstitute?.(sub)}
                    >
                      <span>Substitute</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
