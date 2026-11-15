import {
  FolderTree,
  Mail,
  MapPin,
  Phone,
  Plus,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../api/client.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { Modal } from '../../components/Modal.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const SuppliersPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    paymentTermsDays: 30,
  });

  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '', defaultTaxRatePct: 5 });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        apiRequest('/suppliers?limit=100'),
        apiRequest('/catalog/categories'),
      ]);
      setSuppliers(sRes.items || []);
      setCategories(cRes.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest('/suppliers', {
        method: 'POST',
        body: { ...supForm, paymentTermsDays: Number(supForm.paymentTermsDays) },
      });
      setShowSupModal(false);
      setSupForm({
        code: '',
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        paymentTermsDays: 30,
      });
      setSuccessMsg('Supplier successfully registered.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest('/catalog/categories', {
        method: 'POST',
        body: { ...catForm, defaultTaxRatePct: Number(catForm.defaultTaxRatePct) },
      });
      setShowCatModal(false);
      setCatForm({ name: '', description: '', defaultTaxRatePct: 5 });
      setSuccessMsg('Therapeutic category created.');
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSpinner label="Loading suppliers and categories..." />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendors &amp; Category Taxonomies</h1>
          <p className="page-subtitle">
            Manage authorized pharmaceutical distributors and GST-configured therapeutic categories.
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCatModal(true)}>
              <Plus size={16} /> New Category
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowSupModal(true)}>
              <Plus size={16} /> New Supplier
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="grid-2">
        {/* Left: Suppliers */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Truck size={16} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Authorized Suppliers ({suppliers.length})</h2>
            </div>
          </div>

          {suppliers.length === 0 ? (
            <EmptyState title="No suppliers registered" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Supplier Name</th>
                    <th>Contact Details</th>
                    <th>Terms</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s._id}>
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
                          {s.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                        {s.address && (
                          <div
                            className="text-muted"
                            style={{
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              marginTop: '0.15rem',
                            }}
                          >
                            <MapPin size={11} style={{ opacity: 0.6 }} />
                            <span>{s.address}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{s.contactPerson || '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                          {s.phone} {s.email ? `· ${s.email}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          Net {s.paymentTermsDays}d
                        </span>
                      </td>
                      <td>
                        <StatusBadge
                          status={s.isActive ? 'active' : 'depleted'}
                          label={s.isActive ? 'Active' : 'Disabled'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Categories */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--purple-soft)',
                  color: 'var(--purple)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <FolderTree size={16} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Product Taxonomies ({categories.length})</h2>
            </div>
          </div>

          {categories.length === 0 ? (
            <EmptyState title="No categories defined" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Clinical Scope</th>
                    <th className="num">Default GST %</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <strong style={{ color: 'var(--text)' }}>{c.name}</strong>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {c.description || '—'}
                      </td>
                      <td className="num">
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {c.defaultTaxRatePct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Supplier Modal */}
      {showSupModal && (
        <Modal title="Register Authorized Supplier" onClose={() => setShowSupModal(false)} maxWidth="640px">
          <form onSubmit={handleCreateSupplier}>
            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Vendor Code</label>
                <input
                  className="input mono"
                  required
                  placeholder="e.g. SUP-MED-04"
                  value={supForm.code}
                  onChange={(e) => setSupForm({ ...supForm, code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Legal Entity Name</label>
                <input
                  className="input"
                  required
                  placeholder="Astra Healthcare Wholesale"
                  value={supForm.name}
                  onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Key Account Executive</label>
                <input
                  className="input"
                  placeholder="Vikram Mehta"
                  value={supForm.contactPerson}
                  onChange={(e) => setSupForm({ ...supForm, contactPerson: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dispatch Phone Number</label>
                <input
                  className="input"
                  required
                  placeholder="+91 98200 12345"
                  value={supForm.phone}
                  onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Orders Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="orders@astrahealth.demo"
                  value={supForm.email}
                  onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Net Credit Terms (Days)</label>
                <input
                  type="number"
                  min={0}
                  className="input num"
                  value={supForm.paymentTermsDays}
                  onChange={(e) => setSupForm({ ...supForm, paymentTermsDays: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Warehouse / Fulfillment Address</label>
              <input
                className="input"
                placeholder="Plot 18, MIDC Industrial Area, Mumbai 400093"
                value={supForm.address}
                onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSupModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Register Supplier
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Category Modal */}
      {showCatModal && (
        <Modal title="Create Therapeutic Category" onClose={() => setShowCatModal(false)} maxWidth="480px">
          <form onSubmit={handleCreateCategory}>
            <div className="form-group">
              <label className="form-label">Category Name</label>
              <input
                className="input"
                required
                placeholder="e.g. Cardiovascular &amp; Hypertension"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Statutory GST Rate (%)</label>
              <input
                type="number"
                min={0}
                max={50}
                step="0.5"
                className="input num"
                value={catForm.defaultTaxRatePct}
                onChange={(e) => setCatForm({ ...catForm, defaultTaxRatePct: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Scope &amp; Description</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Clinical indications and formulary scope..."
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCatModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Category
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
