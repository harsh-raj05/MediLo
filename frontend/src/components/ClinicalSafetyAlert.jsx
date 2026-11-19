import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';

export const ClinicalSafetyAlert = ({ safetyData, verified, onToggleVerify }) => {
  const [expanded, setExpanded] = useState(true);

  if (!safetyData || (safetyData.alerts.length === 0 && safetyData.tips.length === 0)) {
    return null;
  }

  const { alerts, tips, hasSevere } = safetyData;

  return (
    <div
      style={{
        background: hasSevere ? 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(145deg, #f0fdfa 0%, #ecfdf5 100%)',
        border: `1px solid ${hasSevere ? '#fde68a' : '#a7f3d0'}`,
        borderRadius: 'var(--radius)',
        padding: '0.85rem 1rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        transition: 'all var(--transition-base)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: hasSevere ? '#d97706' : 'var(--primary)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {hasSevere ? <AlertTriangle size={15} /> : <ShieldAlert size={15} />}
          </div>
          <div>
            <div
              style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: hasSevere ? '#92400e' : '#065f46',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>Clinical Safety &amp; Interaction Checker</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  background: hasSevere ? '#fde68a' : '#ccfbf1',
                  color: hasSevere ? '#78350f' : '#0f766e',
                }}
              >
                {alerts.length} note(s)
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}
          aria-label={expanded ? 'Collapse safety advisory' : 'Expand safety advisory'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Alert Details */}
      {expanded && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: `1px solid ${hasSevere ? '#fde68a' : '#a7f3d0'}` }}>
          {/* Alerts List */}
          {alerts.map((a) => (
            <div
              key={a.id}
              style={{
                marginBottom: '0.6rem',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <strong style={{ color: a.severity === 'WARNING' ? 'var(--warning)' : 'var(--primary)' }}>
                  {a.title}
                </strong>
                <span
                  className="mono"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: a.severity === 'WARNING' ? '#b45309' : '#0369a1',
                  }}
                >
                  {a.severity}
                </span>
              </div>
              <p style={{ margin: '0 0 0.35rem', color: '#475569', lineHeight: 1.4 }}>{a.description}</p>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '0.35rem 0.6rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.35rem',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>Guidance:</span>
                <span>{a.recommendation}</span>
              </div>
            </div>
          ))}

          {/* Quick Administration Tips */}
          {tips.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#065f46' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={12} />
                <span>Administration Timing Tips:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.45 }}>
                {tips.slice(0, 2).map((t, idx) => (
                  <li key={idx}>
                    <strong>{t.medicine}:</strong> {t.guidance}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pharmacist Acknowledgment */}
          {onToggleVerify && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.75rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => onToggleVerify(e.target.checked)}
                style={{ accentColor: 'var(--primary)', width: 15, height: 15 }}
              />
              <span>Pharmacist verified clinical counseling provided to patient</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
};
