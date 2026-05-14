'use client';

import type { CSSProperties, ReactNode, ChangeEvent } from 'react';

// ─────────────────────────────────────────────────────────────
//  Admin UI primitives — utilitarian back-office style. Used by
//  every editor page under /admin.
// ─────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 28,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'Newsreader, serif',
            fontWeight: 400,
            fontSize: 30,
            letterSpacing: '-0.02em',
            margin: 0,
            color: '#1c1813',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '6px 0 0', color: '#5a524a', fontSize: 14, maxWidth: 640 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </header>
  );
}

export function Card({
  children,
  style,
  noPad,
}: {
  children: ReactNode;
  style?: CSSProperties;
  noPad?: boolean;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e6e1d4',
        borderRadius: 6,
        padding: noPad ? 0 : 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: 'neutral' | 'attention' | 'good' | 'warn';
}) {
  const tones: Record<string, { fg: string; bg: string }> = {
    neutral: { fg: '#1c1813', bg: '#ffffff' },
    attention: { fg: '#c99846', bg: '#fdf6ea' },
    good: { fg: '#1f4a38', bg: '#eaf3ee' },
    warn: { fg: '#b43e2e', bg: '#fbeeec' },
  };
  const t = tones[tone];
  const inner = (
    <div
      style={{
        background: t.bg,
        border: '1px solid #e6e1d4',
        borderRadius: 6,
        padding: 18,
        textDecoration: 'none',
        color: t.fg,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        height: '100%',
      }}
    >
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#5a524a',
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'Newsreader, serif', fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: '#5a524a' }}>{hint}</div>}
    </div>
  );
  return href ? (
    <a href={href} style={{ textDecoration: 'none' }}>
      {inner}
    </a>
  ) : (
    inner
  );
}

export function Btn({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  disabled,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
  href?: string;
}) {
  const variants: Record<string, CSSProperties> = {
    primary: { background: '#1c1813', color: '#fafaf7', border: '1px solid #1c1813' },
    secondary: { background: '#ffffff', color: '#1c1813', border: '1px solid #d9cfb6' },
    danger: { background: '#ffffff', color: '#b43e2e', border: '1px solid #f0c1bb' },
    ghost: { background: 'transparent', color: '#1c1813', border: '1px solid transparent' },
  };
  const sizes: Record<string, CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '9px 16px', fontSize: 13 },
  };
  const style: CSSProperties = {
    ...variants[variant],
    ...sizes[size],
    fontFamily: 'inherit',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    fontWeight: 500,
    letterSpacing: '0.01em',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  if (href) {
    return (
      <a href={href} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  span,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  span?: number;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#1c1813' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: '#5a524a' }}>{hint}</span>}
    </label>
  );
}

const inputStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d9cfb6',
  padding: '10px 12px',
  fontSize: 14,
  borderRadius: 4,
  fontFamily: 'inherit',
  color: '#1c1813',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 1}
      disabled={disabled}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      style={inputStyle}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: '#1c1813' }}
      />
      {label}
    </label>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'attention' | 'warn' | 'info';
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: '#f1efe8', fg: '#1c1813' },
    good: { bg: '#eaf3ee', fg: '#1f4a38' },
    attention: { bg: '#fdf6ea', fg: '#a67428' },
    warn: { bg: '#fbeeec', fg: '#b43e2e' },
    info: { bg: '#e8eef5', fg: '#1c4a72' },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.fg,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '3px 7px',
        borderRadius: 3,
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        background: '#fafaf7',
        border: '1px dashed #d9cfb6',
        borderRadius: 6,
        color: '#5a524a',
      }}
    >
      <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, color: '#1c1813', marginBottom: 6 }}>
        {title}
      </div>
      {hint && <div style={{ fontSize: 13 }}>{hint}</div>}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  rowKey,
}: {
  columns: { key: string; label: string; width?: string; align?: 'left' | 'right' }[];
  rows: { id: string; cells: ReactNode[] }[];
  rowKey?: string;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align ?? 'left',
                  padding: '10px 12px',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#5a524a',
                  borderBottom: '1px solid #e6e1d4',
                  width: c.width,
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #f1efe8' }}>
              {r.cells.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '12px',
                    textAlign: columns[ci]?.align ?? 'left',
                    color: '#1c1813',
                    verticalAlign: 'middle',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
