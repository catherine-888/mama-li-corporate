'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Tone } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Shared UI primitives — ported from the prototype's ui.jsx.
//  Kept as inline-style components to match the original look
//  exactly; Tailwind/CSS Modules can be introduced later if the
//  team prefers but isn't necessary now.
// ─────────────────────────────────────────────────────────────

const MAMA_LI_LOGO = 'https://www.mamali.co.uk/wp-content/uploads/2024/06/logo.png';

export function Logo({ size = 28, mono = false }: { size?: number; mono?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src={MAMA_LI_LOGO}
        alt="Mama Li"
        onError={() => setFailed(true)}
        style={{
          height: size * 1.6,
          width: 'auto',
          display: 'block',
          filter: mono ? 'brightness(0) invert(1) contrast(1.2)' : 'none',
          objectFit: 'contain',
        }}
      />
    );
  }
  const ink = mono ? 'currentColor' : 'var(--ink)';
  const mark = mono ? 'currentColor' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="3" fill={mark} />
        <text
          x="20"
          y="27"
          textAnchor="middle"
          fontFamily="Newsreader, serif"
          fontWeight="600"
          fontSize="22"
          fill="var(--cream)"
          style={{ fontStyle: 'italic' }}
        >
          M
        </text>
        <text
          x="33"
          y="13"
          textAnchor="middle"
          fontFamily="Newsreader, serif"
          fontWeight="600"
          fontSize="9"
          fill="var(--cream)"
        >
          李
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'Newsreader, serif',
            fontWeight: 500,
            fontStyle: 'italic',
            fontSize: size * 0.7,
            color: ink,
            letterSpacing: '-0.01em',
          }}
        >
          Mama Li
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: size * 0.28,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: ink,
            opacity: 0.55,
            marginTop: 4,
          }}
        >
          Corporate
        </span>
      </div>
    </div>
  );
}

export function FoodPlate({
  label,
  ratio = '4 / 3',
  tone = 'jade',
  char,
  img,
}: {
  label?: string;
  ratio?: string;
  tone?: Tone;
  char?: string;
  img?: string;
}) {
  const [failed, setFailed] = useState(false);
  const stripes: Record<Tone, string> = {
    jade: 'repeating-linear-gradient(135deg, rgba(45,90,71,0.10) 0 2px, transparent 2px 14px)',
    accent: 'repeating-linear-gradient(135deg, rgba(31,74,56,0.12) 0 2px, transparent 2px 14px)',
    cream: 'repeating-linear-gradient(135deg, rgba(28,24,20,0.06) 0 2px, transparent 2px 14px)',
    gold: 'repeating-linear-gradient(135deg, rgba(201,152,70,0.14) 0 2px, transparent 2px 14px)',
  };
  const bgs: Record<Tone, string> = {
    jade: 'oklch(0.94 0.025 155)',
    accent: 'oklch(0.94 0.03 160)',
    cream: 'oklch(0.95 0.012 80)',
    gold: 'oklch(0.94 0.04 80)',
  };
  const showImg = img && !failed;
  return (
    <div
      style={{
        aspectRatio: ratio,
        background: bgs[tone],
        backgroundImage: showImg ? 'none' : stripes[tone],
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
      }}
    >
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={label || ''}
          onError={() => setFailed(true)}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
      {!showImg && (
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          style={{ position: 'absolute', top: 10, left: 10, opacity: 0.18 }}
          aria-hidden="true"
        >
          <path d="M2 2 L18 2 L18 6 L6 6 L6 18 L2 18 Z" fill="var(--ink)" />
        </svg>
      )}
      {char && !showImg && (
        <span
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            fontFamily: 'Newsreader, serif',
            fontSize: 40,
            fontWeight: 600,
            color: 'var(--ink)',
            opacity: 0.22,
          }}
        >
          {char}
        </span>
      )}
      {showImg && label && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 80,
            background: 'linear-gradient(180deg, transparent, rgba(28,24,19,0.55))',
            pointerEvents: 'none',
          }}
        />
      )}
      {showImg && char && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontFamily: 'Newsreader, serif',
            fontSize: 16,
            color: 'var(--cream)',
            background: 'rgba(28,24,19,0.55)',
            padding: '4px 8px',
            borderRadius: 2,
            backdropFilter: 'blur(4px)',
          }}
        >
          {char}
        </span>
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '14px 16px',
        }}
      >
        {label && (
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: showImg ? 'var(--cream)' : 'var(--ink)',
              opacity: showImg ? 0.95 : 0.55,
              background: showImg ? 'transparent' : 'var(--cream)',
              padding: showImg ? '0' : '4px 8px',
              borderRadius: 2,
              position: 'relative',
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export function Stamp({
  children,
  color = 'var(--accent)',
  size = 88,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1.5px solid ${color}`,
        color,
        fontFamily: 'Newsreader, serif',
        fontStyle: 'italic',
        fontSize: size * 0.18,
        textAlign: 'center',
        lineHeight: 1.1,
        transform: 'rotate(-6deg)',
        position: 'relative',
      }}
    >
      <span style={{ padding: '0 8px', position: 'relative', zIndex: 1 }}>{children}</span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: size * 0.06,
          borderRadius: '50%',
          border: `1px solid ${color}`,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

export function CloudRule({
  color = 'var(--accent)',
  width = '100%',
  flip,
}: {
  color?: string;
  width?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 14"
      width={width}
      height="14"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ display: 'block', transform: flip ? 'scaleY(-1)' : 'none', color }}
    >
      <path
        d="M0 7 L36 7 C40 7 40 3 44 3 C48 3 48 7 52 7 L84 7 C88 7 88 11 92 11 C96 11 96 7 100 7 L132 7 C136 7 136 3 140 3 C144 3 144 7 148 7 L180 7 C184 7 184 11 188 11 C192 11 192 7 196 7 L240 7"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

export function CornerBracket({
  size = 18,
  color = 'var(--accent)',
  placement = 'tl',
  thickness = 1.5,
}: {
  size?: number;
  color?: string;
  placement?: 'tl' | 'tr' | 'br' | 'bl';
  thickness?: number;
}) {
  const rot = { tl: 0, tr: 90, br: 180, bl: 270 }[placement];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      style={{ transform: `rotate(${rot}deg)`, color }}
      aria-hidden="true"
    >
      <path
        d="M0 6 L0 0 L6 0 M0 2 L0 0 L2 0 M14 0 L18 0 L18 4"
        stroke="currentColor"
        strokeWidth={thickness}
        fill="none"
      />
    </svg>
  );
}

export function VerticalTablet({
  chars,
  color = 'var(--accent)',
  size = 16,
}: {
  chars: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        padding: '14px 8px',
        border: `1px solid ${color}`,
        color,
        fontFamily: 'Newsreader, serif',
        fontSize: size,
        lineHeight: 1.1,
        alignItems: 'center',
        gap: 6,
      }}
    >
      {chars.split('').map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}

export function LatticeBg({ color = 'var(--accent)', opacity = 0.08 }: { color?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(0deg, ${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}
    />
  );
}

export function KnotMark({ size = 36, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" style={{ color }}>
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="18" cy="18" r="14" opacity="0.6" />
        <path d="M10 18 L18 10 L26 18 L18 26 Z" />
        <path d="M14 18 L18 14 L22 18 L18 22 Z" />
      </g>
    </svg>
  );
}

export type BtnVariant = 'primary' | 'secondary' | 'accent' | 'ghost';
export type BtnSize = 'sm' | 'md' | 'lg';

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  full,
  type = 'button',
  style,
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  full?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
}) {
  const sizes: Record<BtnSize, CSSProperties> = {
    sm: { padding: '8px 14px', fontSize: 13 },
    md: { padding: '12px 22px', fontSize: 14 },
    lg: { padding: '16px 28px', fontSize: 15 },
  };
  const variants: Record<BtnVariant, CSSProperties> = {
    primary: {
      background: disabled ? 'oklch(0.85 0.01 80)' : 'var(--ink)',
      color: 'var(--cream)',
      border: '1px solid var(--ink)',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--ink)',
      border: '1px solid var(--ink)',
    },
    accent: {
      background: 'var(--accent)',
      color: 'var(--cream)',
      border: '1px solid var(--accent)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--ink)',
      border: '1px solid transparent',
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sizes[size],
        ...variants[variant],
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500,
        letterSpacing: '0.01em',
        borderRadius: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        width: full ? '100%' : 'auto',
        transition: 'transform 120ms ease, background 120ms ease',
        ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'jade' }: { children: ReactNode; tone?: 'jade' | 'accent' | 'gold' | 'ink' | 'alert' }) {
  const tones: Record<string, { bg: string; fg: string }> = {
    jade: { bg: 'oklch(0.94 0.03 155)', fg: 'var(--jade)' },
    accent: { bg: 'oklch(0.93 0.04 160)', fg: 'var(--accent)' },
    gold: { bg: 'oklch(0.94 0.04 80)', fg: 'oklch(0.45 0.10 75)' },
    ink: { bg: 'oklch(0.92 0.01 80)', fg: 'var(--ink)' },
    alert: { bg: 'oklch(0.94 0.05 30)', fg: 'var(--alert)' },
  };
  const t = tones[tone] || tones.jade;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: t.bg,
        color: t.fg,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: 2,
      }}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  kicker,
  kickerCN,
  title,
  sub,
  align = 'left',
}: {
  kicker?: string;
  kickerCN?: string;
  title: ReactNode;
  sub?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div style={{ textAlign: align, marginBottom: 28 }}>
      {kicker && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: align === 'center' ? 'center' : 'flex-start',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 14,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 24,
              height: 1,
              background: 'var(--accent)',
            }}
          />
          {kicker}
          {kickerCN && (
            <span
              style={{
                fontFamily: 'Newsreader, serif',
                fontSize: 14,
                letterSpacing: '0.05em',
                opacity: 0.7,
                textTransform: 'none',
              }}
            >
              · {kickerCN}
            </span>
          )}
        </div>
      )}
      <h2
        style={{
          fontFamily: 'Newsreader, serif',
          fontWeight: 400,
          fontSize: 'clamp(28px, 3.4vw, 44px)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: 0,
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            lineHeight: 1.55,
            color: 'var(--ink-soft)',
            marginTop: 14,
            maxWidth: 580,
            marginLeft: align === 'center' ? 'auto' : 0,
            marginRight: align === 'center' ? 'auto' : 0,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function PulseDot({ color = 'var(--gold)' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', width: 8, height: 8, display: 'inline-block' }}>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: color,
          borderRadius: '50%',
          animation: 'pulse 1.6s ease-in-out infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: color,
          borderRadius: '50%',
        }}
      />
    </span>
  );
}
