import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border)',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        Showing page <strong style={{ color: 'var(--text)' }}>{page}</strong> of{' '}
        <strong style={{ color: 'var(--text)' }}>{totalPages}</strong>{' '}
        <span style={{ opacity: 0.75 }}>({total} total records)</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0 0.25rem',
          }}
        >
          <span
            style={{
              minWidth: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {page}
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>/</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {totalPages}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
