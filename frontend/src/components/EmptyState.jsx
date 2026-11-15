import { Inbox } from 'lucide-react';

export const EmptyState = ({
  title = 'No records found',
  description = 'Try adjusting your search criteria or clear filters to view results.',
  action,
}) => (
  <div
    style={{
      textAlign: 'center',
      padding: '3rem 1.5rem',
      background: 'var(--surface-subtle)',
      border: '1px dashed var(--border-muted)',
      borderRadius: 'var(--radius-md)',
      margin: '0.75rem 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 'var(--radius)',
        background: '#ffffff',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-tertiary)',
        marginBottom: '1rem',
      }}
    >
      <Inbox size={26} strokeWidth={1.8} />
    </div>
    <div
      style={{
        fontWeight: 700,
        fontSize: '1rem',
        color: 'var(--text)',
        letterSpacing: '-0.01em',
        marginBottom: '0.35rem',
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        maxWidth: '380px',
        lineHeight: 1.45,
        marginBottom: action ? '1.25rem' : 0,
      }}
    >
      {description}
    </div>
    {action}
  </div>
);
