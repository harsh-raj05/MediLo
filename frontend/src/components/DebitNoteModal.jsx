import { Check, CheckCircle2, FileText, IndianRupee, Printer, ShieldAlert, Truck, X } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatDateTime, formatMoney, generateIdempotencyKey } from '../api/client.js';
import { MediloIcon, MediloWordmark } from './MediloBrand.jsx';
import { Modal } from './Modal.jsx';

export const DebitNoteModal = ({
  batch,
  onClose,
  onSubmitDebitNote,
}) => {
  if (!batch) return null;

  const [returnQty, setReturnQty] = useState(batch.quantityOnHand || 1);
  const [reason, setReason] = useState('NEAR_EXPIRY_RETURN');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatedNote, setGeneratedNote] = useState(null);

  const debitNoteNumber = `DN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const creditValue = returnQty * (batch.unitCost || 0);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitDebitNote?.({
        batchId: batch._id,
        returnQty: Number(returnQty),
        reason: `${reason}: ${remarks || 'Supplier Credit Return'} (Ref: ${debitNoteNumber})`,
        debitNoteNumber,
        creditValue,
      });

      setGeneratedNote({
        debitNoteNumber,
        date: new Date().toISOString(),
        returnQty: Number(returnQty),
        creditValue,
        reason,
        remarks,
      });
    } catch (err) {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={generatedNote ? `Supplier Debit Note · ${generatedNote.debitNoteNumber}` : `Create Supplier Debit Note · Batch #${batch.batchNumber}`}
      onClose={onClose}
      maxWidth="720px"
    >
      {generatedNote ? (
        <div className="printable-invoice" style={{ padding: '0.25rem' }}>
          {/* Official Debit Note Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '1rem',
              borderBottom: '2px solid var(--border)',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <MediloIcon size={32} glow={false} />
                <MediloWordmark size="sm" theme="light" />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                GSTIN: 27AABCM1234D1Z8 · Pharmacy Operations
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="badge badge-warning" style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                GST DEBIT NOTE (SEC 34)
              </div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                {generatedNote.debitNoteNumber}
              </div>
              <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                Date: {formatDateTime(generatedNote.date)}
              </div>
            </div>
          </div>

          {/* Supplier details card */}
          <div
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              fontSize: '0.84rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                Issued To Supplier
              </div>
              <strong style={{ color: 'var(--text)' }}>{batch.supplierId?.name || 'Authorized Distributor'}</strong>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                GSTIN: {batch.supplierId?.taxId || '27AABCA1234F1Z9'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                Adjustment Classification
              </div>
              <strong style={{ color: 'var(--warning)' }}>Supplier Credit / Stock Return</strong>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Reason: {generatedNote.reason}
              </div>
            </div>
          </div>

          {/* Line details table */}
          <div className="table-wrap" style={{ marginBottom: '1.25rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Medicine Description</th>
                  <th>Batch / Expiry</th>
                  <th className="num">Returned Qty</th>
                  <th className="num">Unit Cost</th>
                  <th className="num">Claim Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 700 }}>{batch.medicineId?.name || 'Pharmaceutical Item'}</div>
                    <div className="mono text-muted" style={{ fontSize: '0.74rem' }}>
                      SKU: {batch.medicineId?.sku || 'SKU'}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: '0.82rem' }}>
                    #{batch.batchNumber} · Exp: {formatDate(batch.expiryDate)}
                  </td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {generatedNote.returnQty}
                  </td>
                  <td className="num">{formatMoney(batch.unitCost)}</td>
                  <td className="num" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    {formatMoney(generatedNote.creditValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={15} /> Print Debit Note
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerate} style={{ padding: '0.25rem' }}>
          <div
            style={{
              background: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <ShieldAlert size={22} color="#b45309" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.4 }}>
              <strong>Supplier Credit Request (GST Debit Note):</strong> Returns near-expiry or unsellable stock back to the original pharmaceutical distributor for credit adjustment.
            </div>
          </div>

          {/* Medicine & Batch Overview */}
          <div
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              fontSize: '0.84rem',
            }}
          >
            <div>
              <span className="text-muted" style={{ fontSize: '0.74rem' }}>Medicine:</span>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{batch.medicineId?.name}</div>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.74rem' }}>Batch Number:</span>
              <div className="mono" style={{ fontWeight: 700 }}>#{batch.batchNumber}</div>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.74rem' }}>Batch Expiry Date:</span>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--danger)' }}>
                {formatDate(batch.expiryDate)}
              </div>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.74rem' }}>Current Stock On Hand:</span>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{batch.quantityOnHand} units</div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '0.85rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Return Quantity (Max: {batch.quantityOnHand})</label>
              <input
                type="number"
                min={1}
                max={batch.quantityOnHand}
                className="input num"
                required
                value={returnQty}
                onChange={(e) => setReturnQty(Math.min(batch.quantityOnHand, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Supplier Return</label>
              <select
                className="select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="NEAR_EXPIRY_RETURN">Near-Expiry Return (≤ 60 Days)</option>
                <option value="EXPIRED_STOCK">Expired Stock Reclamation</option>
                <option value="PACKAGING_DAMAGE">Damaged Packaging / Seal Tampered</option>
                <option value="MANUFACTURER_RECALL">Manufacturer Regulatory Recall</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Auditor Remarks / Reference Note</label>
            <input
              className="input"
              placeholder="e.g. As agreed with distributor field rep for monthly credit"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Credit Valuation Bar */}
          <div
            style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)' }}>
              Total Supplier Credit Valuation:
            </span>
            <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
              {formatMoney(creditValue)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Generating Note...' : 'Issue GST Debit Note & Quarantine Stock'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
