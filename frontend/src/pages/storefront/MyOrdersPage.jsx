import { Calendar, Eye, FileText, Package, Receipt } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, buildQueryString, formatDateTime, formatMoney } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { InvoiceModal } from '../../components/InvoiceModal.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/sales${buildQueryString({ page, limit: 15 })}`);
      setOrders(res.items || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders &amp; Invoices</h1>
          <p className="page-subtitle">
            View your order history, verified batch allocations, and print GST tax receipts.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <LoadingSpinner label="Loading your order history..." />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Orders you place in the OTC storefront will be recorded here with complete batch details."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Placed At</th>
                    <th>Ordered Medicines</th>
                    <th>Fulfillment Status</th>
                    <th className="num">GST Total</th>
                    <th className="num">Grand Total</th>
                    <th style={{ textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((sale) => (
                    <tr key={sale._id}>
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
                          {sale.invoiceNumber}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} style={{ opacity: 0.6 }} />
                          <span>{formatDateTime(sale.createdAt)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {sale.items.map((i, idx) => (
                            <div key={idx} style={{ fontSize: '0.84rem' }}>
                              <strong style={{ color: 'var(--text)' }}>{i.medicineName}</strong>{' '}
                              <span style={{ color: 'var(--text-muted)' }}>&times; {i.requestedQuantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td><StatusBadge status={sale.status} /></td>
                      <td className="num">{formatMoney(sale.taxTotal)}</td>
                      <td className="num">
                        <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>
                          {formatMoney(sale.grandTotal)}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <Eye size={13} /> View / Print
                        </button>
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

      {selectedSale && <InvoiceModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </div>
  );
};
