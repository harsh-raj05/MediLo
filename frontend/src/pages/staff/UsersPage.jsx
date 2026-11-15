import {
  Calendar,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, formatDateTime } from '../../api/client.js';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/users?limit=50');
      setUsers(res.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUpdate = async (id, patch) => {
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest(`/auth/users/${id}`, { method: 'PATCH', body: patch });
      setSuccessMsg('User security credentials and access permissions updated.');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSpinner label="Querying user directory and RBAC permissions..." />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users &amp; Role-Based Access Control (RBAC)</h1>
          <p className="page-subtitle">
            Manage authenticated staff operators and customer accounts with server-side privilege enforcement on every route.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {successMsg && <div className="alert alert-success" role="status">{successMsg}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User Account</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Account Status</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Security Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const initials = (u.name || 'User')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                const roleColor =
                  u.role === 'admin'
                    ? '#a855f7'
                    : u.role === 'pharmacist'
                    ? '#14b8a6'
                    : '#0ea5e9';

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'var(--surface-muted)',
                            border: `2px solid ${roleColor}`,
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            color: 'var(--text)',
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text)' }}>{u.name}</strong>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            ID: {u.id?.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: '0.84rem' }}>{u.email}</td>
                    <td>
                      <select
                        className="select"
                        style={{
                          width: '145px',
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                        }}
                        value={u.role}
                        onChange={(e) => handleUpdate(u.id, { role: e.target.value })}
                      >
                        <option value="admin">Admin (Full)</option>
                        <option value="pharmacist">Pharmacist</option>
                        <option value="customer">Customer</option>
                      </select>
                    </td>
                    <td>
                      <StatusBadge
                        status={u.isActive ? 'active' : 'expired'}
                        label={u.isActive ? 'Active' : 'Disabled'}
                      />
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={`btn ${u.isActive ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => handleUpdate(u.id, { isActive: !u.isActive })}
                      >
                        {u.isActive ? (
                          <>
                            <UserX size={13} style={{ color: 'var(--danger)' }} /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} /> Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
