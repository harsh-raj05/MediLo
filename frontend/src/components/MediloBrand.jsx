import React from 'react';

/**
 * MediloIcon — Custom Crafted Medical & FEFO Precision SVG Brand Mark
 * Combines an architectural "M" monogram, precision medical cross (+),
 * and dynamic digital pharmaceutical flow.
 */
export const MediloIcon = ({
  size = 36,
  className = '',
  glow = true,
  rounded = true,
  style = {},
}) => {
  const s = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`medilo-icon-wrapper ${className}`}
      style={{
        width: s,
        height: s,
        display: 'inline-grid',
        placeItems: 'center',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: 'block',
          filter: glow ? 'drop-shadow(0 4px 12px rgba(13, 148, 136, 0.35))' : 'none',
        }}
      >
        <defs>
          {/* Main Shield Gradient: Deep Clinical Teal to Bright Vibrant Teal */}
          <linearGradient id="mediloShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Glowing Front Ribbons: Emerald-Cyan Neon */}
          <linearGradient id="mediloRibbonA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="50%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>

          <linearGradient id="mediloRibbonB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#ccfbf1" />
            <stop offset="100%" stopColor="#5eead4" />
          </linearGradient>

          {/* Accent Cross Core */}
          <linearGradient id="mediloCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>

          {/* Subtle Glass Surface Reflection */}
          <linearGradient id="mediloGlassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Squircle Brand Canvas with Specular Bevel */}
        <rect
          x="1"
          y="1"
          width="42"
          height="42"
          rx={rounded ? "11" : "6"}
          fill="url(#mediloShieldGrad)"
        />
        <rect
          x="1.5"
          y="1.5"
          width="41"
          height="41"
          rx={rounded ? "10.5" : "5.5"}
          stroke="url(#mediloGlassGloss)"
          strokeWidth="1.2"
        />

        {/* Top Gloss Sheen (glassmorphism highlight) */}
        <path
          d="M2 13 C2 7 7 2 13 2 L31 2 C37 2 42 7 42 13 L42 20 C32 17 12 18 2 26 Z"
          fill="url(#mediloGlassGloss)"
        />

        {/* The 'M' Monogram & Precision Medical Cross Lockup */}
        {/* Left Column / Stem */}
        <rect x="9.5" y="14" width="4.8" height="17" rx="2.4" fill="url(#mediloRibbonB)" />

        {/* Right Column / Stem */}
        <rect x="29.7" y="14" width="4.8" height="17" rx="2.4" fill="url(#mediloRibbonB)" />

        {/* Central Interlocking Monogram Angles (Apex into Center Cross) */}
        <path
          d="M12 14 L22 25 L32 14"
          stroke="url(#mediloRibbonA)"
          strokeWidth="4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The Clinical Cross Heart Node (+) */}
        {/* Vertical Bar */}
        <rect
          x="19.7"
          y="15.5"
          width="4.6"
          height="13"
          rx="2.3"
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}
        />
        {/* Horizontal Bar */}
        <rect
          x="15.5"
          y="19.7"
          width="13"
          height="4.6"
          rx="2.3"
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}
        />

        {/* Luminous Core Pulse Dot */}
        <circle cx="22" cy="22" r="1.6" fill="url(#mediloCoreGrad)" />
      </svg>
    </div>
  );
};

/**
 * MediloWordmark — Premium Custom Typography with Signature Medical Cross Accent
 */
export const MediloWordmark = ({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  theme = 'dark', // 'dark' (on dark backgrounds) | 'light' (on white/light backgrounds)
  badge = null,
  showDotAccent = true,
  style = {},
}) => {
  const fontSizes = {
    sm: { main: '1.05rem', sub: '0.62rem', badge: '0.58rem' },
    md: { main: '1.25rem', sub: '0.68rem', badge: '0.62rem' },
    lg: { main: '1.5rem', sub: '0.74rem', badge: '0.66rem' },
    xl: { main: '2.1rem', sub: '0.85rem', badge: '0.72rem' },
  };

  const fs = fontSizes[size] || fontSizes.md;
  const isDarkBg = theme === 'dark';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.45rem',
        userSelect: 'none',
        ...style,
      }}
    >
      <div
        className="medilo-wordmark-text"
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: fs.main,
          letterSpacing: '-0.035em',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {/* "Medi" — Strong clinical foundation */}
        <span
          style={{
            color: isDarkBg ? '#ffffff' : '#0f172a',
            transition: 'color var(--transition-fast)',
          }}
        >
          Med
        </span>

        {/* Custom 'i' with Glowing Medical Cross Accent */}
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            color: isDarkBg ? '#ffffff' : '#0f172a',
          }}
        >
          {showDotAccent ? (
            <>
              {/* Lower stem of 'i' */}
              <span>ı</span>
              {/* Bespoke Medical Cross Dot */}
              <span
                style={{
                  position: 'absolute',
                  top: '-0.18em',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#2dd4bf',
                  fontSize: '0.55em',
                  fontWeight: 900,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 0 4px rgba(45, 212, 191, 0.6))',
                }}
              >
                +
              </span>
            </>
          ) : (
            'i'
          )}
        </span>

        {/* "lo" — Dynamic pharmacy technology accent in luminous teal gradient */}
        <span
          style={{
            background: 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 60%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginLeft: '0.02em',
          }}
        >
          lo
        </span>
      </div>

      {badge && (
        <span
          className="brand-pill-badge"
          style={{
            fontSize: fs.badge,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#2dd4bf',
            background: isDarkBg ? 'rgba(45, 212, 191, 0.14)' : 'rgba(13, 148, 136, 0.1)',
            border: `1px solid ${isDarkBg ? 'rgba(45, 212, 191, 0.3)' : 'rgba(13, 148, 136, 0.25)'}`,
            padding: '0.15rem 0.45rem',
            borderRadius: '999px',
            alignSelf: 'center',
            lineHeight: 1.2,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
};

/**
 * MediloBrand — Full Lockup Component (Icon + Wordmark + Subtitle Tagline)
 */
export const MediloBrand = ({
  iconSize = 38,
  textSize = 'md',
  theme = 'dark', // 'dark' for sidebar / dark hero, 'light' for topbars / invoices / white modals
  subtitle = 'Pharmacy Intelligence',
  badge = null,
  compact = false,
  className = '',
  style = {},
}) => {
  const isDarkBg = theme === 'dark';

  return (
    <div
      className={`medilo-brand-lockup ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        textDecoration: 'none',
        ...style,
      }}
    >
      <MediloIcon size={iconSize} glow={isDarkBg} />

      {!compact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.12rem', minWidth: 0 }}>
          <MediloWordmark size={textSize} theme={theme} badge={badge} />
          {subtitle && (
            <div
              style={{
                fontSize: textSize === 'lg' ? '0.75rem' : textSize === 'xl' ? '0.82rem' : '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: isDarkBg ? '#94a3b8' : 'var(--text-muted)',
                lineHeight: 1.1,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
