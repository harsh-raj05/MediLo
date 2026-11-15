import { CheckCircle2, FileText, Hash, Printer } from 'lucide-react';
import { formatDate, formatDateTime, formatMoney } from '../api/client.js';
import { MediloIcon, MediloWordmark } from './MediloBrand.jsx';
import { Modal } from './Modal.jsx';
import { StatusBadge } from './StatusBadge.jsx';

export const InvoiceModal = ({ sale, onClose }) => {
  if (!sale) return null;

  return (
    <Modal title={`Tax Invoice · ${sale.invoiceNumber}`} onClose={onClose} maxWidth="820px">
      <div className="printable-invoice">
        {/* Top Header Card */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            paddingBottom: '1.25rem',
            borderBottom: '2px dashed var(--border)',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <MediloIcon size={34} glow={false} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MediloWordmark size="md" theme="light" showDotAccent={true} />
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    PHARMACY
                  </span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Licensed Pharmacy Retailer &amp; FEFO Inventory Control
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
              GSTIN: 27AABCM1234D1Z8 · D.L. No: MH-TZ2-123456
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
              Issued: {formatDateTime(sale.createdAt)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              className="mono"
              style={{
                fontWeight: 700,
                fontSize: '1.15rem',
                color: 'var(--primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {sale.invoiceNumber}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.4rem',
                justifyContent: 'flex-end',
                marginTop: '0.4rem',
                flexWrap: 'wrap',
              }}
            >
              <StatusBadge
                status={sale.saleType}
                label={sale.saleType === 'ONLINE_ORDER' ? 'Online OTC' : 'POS Counter'}
              />
              <StatusBadge status={sale.status} />
            </div>
          </div>
        </div>

        {/* Customer & Transaction Info Grid */}
        <div
          style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '0.2rem' }}>
              Billed To
            </div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text)' }}>{sale.customerName}</strong>
            {sale.customerPhone && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{sale.customerPhone}</div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '0.2rem' }}>
              Payment Method
            </div>
            <strong style={{ color: 'var(--text)' }}>{sale.paymentMethod}</strong>
            <div style={{ color: 'var(--success)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <CheckCircle2 size={13} /> Paid in Full
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '0.2rem' }}>
              Dispensed By
            </div>
            <strong style={{ color: 'var(--text)' }}>{sale.createdBy?.name || 'System Auto-FEFO'}</strong>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Staff Operator</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="table-wrap" style={{ marginBottom: '1.25rem' }}>
          <table>
            <thead>
              <tr>
                <th>Medicine Description</th>
                <th>Batch Allocation (FEFO)</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
                <th className="num">GST %</th>
                <th className="num">GST Amt</th>
                <th className="num">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={`${item.medicineId}-${idx}`}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.medicineName}</div>
                    <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>SKU: {item.sku}</div>
                  </td>
                  <td>
                    {item.allocations.map((a, aIdx) => (
                      <div key={aIdx} style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        <span className="mono" style={{ background: 'var(--surface-muted)', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 600 }}>
                          #{a.batchNumber}
                        </span>{' '}
                        · {a.quantity} u · Exp: {formatDate(a.expiryDate)}
                        {a.returnedQuantity > 0 && (
                          <span style={{ color: 'var(--danger)', fontWeight: 600, marginLeft: '0.4rem' }}>
                            (Ret: {a.returnedQuantity})
                          </span>
                        )}
                      </div>
                    ))}
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{item.requestedQuantity}</td>
                  <td className="num">{formatMoney(item.allocations[0]?.unitPrice)}</td>
                  <td className="num">{item.taxRatePct}%</td>
                  <td className="num">{formatMoney(item.itemTax)}</td>
                  <td className="num"><strong style={{ color: 'var(--text)' }}>{formatMoney(item.itemTotal)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary Box */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <div
            style={{
              width: '320px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontSize: '0.88rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: 'var(--text-muted)' }}>
              <span>Subtotal</span>
              <span className="mono">{formatMoney(sale.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: 'var(--text-muted)' }}>
              <span>Statutory GST (CGST + SGST)</span>
              <span className="mono">{formatMoney(sale.taxTotal)}</span>
            </div>
            {sale.discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: 'var(--success)', fontWeight: 600 }}>
                <span>Discount Applied</span>
                <span className="mono">−{formatMoney(sale.discountTotal)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.65rem 0 0.2rem',
                marginTop: '0.5rem',
                borderTop: '2px solid var(--border)',
                fontWeight: 800,
                fontSize: '1.15rem',
                color: 'var(--text)',
              }}
            >
              <span>Net Grand Total</span>
              <span className="mono" style={{ color: 'var(--primary)' }}>{formatMoney(sale.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions for screen & print */}
        <div
          className="no-print"
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            System-generated electronic invoice with immutable FEFO allocation ledger.
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              <Printer size={16} /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
