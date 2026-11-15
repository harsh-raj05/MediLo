const STYLE_MAP = {
  active: 'badge-success',
  COMPLETED: 'badge-success',
  RESTOCKABLE: 'badge-success',
  POS: 'badge-info',
  ONLINE_ORDER: 'badge-info',
  near_expiry: 'badge-warning',
  PARTIALLY_RETURNED: 'badge-warning',
  low: 'badge-warning',
  quarantined: 'badge-warning',
  expired: 'badge-danger',
  RETURNED: 'badge-danger',
  DAMAGED: 'badge-danger',
  out: 'badge-danger',
  depleted: 'badge-neutral',
};

export const StatusBadge = ({ status, label }) => {
  const cls = STYLE_MAP[status] || 'badge-neutral';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      <span>{label || status}</span>
    </span>
  );
};
