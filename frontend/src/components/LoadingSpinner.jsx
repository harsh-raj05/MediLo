export const LoadingSpinner = ({ label = 'Loading...' }) => (
  <div
    style={{
      padding: '4rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      color: 'var(--text-muted)',
    }}
    role="status"
    aria-live="polite"
  >
    <div style={{ position: 'relative', width: 44, height: 44 }}>
      <svg
        style={{
          width: '100%',
          height: '100%',
          animation: 'spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeOpacity="0.18"
        />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          background: 'var(--primary-soft)',
          opacity: 0.5,
          filter: 'blur(4px)',
        }}
      />
    </div>
    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>
      {label}
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);
