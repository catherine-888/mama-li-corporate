'use client';

import { useState, useRef } from 'react';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  ImageField — upload to Supabase Storage via /admin/api/upload,
//  or paste a URL. Shows a preview. Used in bundle/site-settings
//  forms.
//
//  In mock mode, file selection just shows the local preview (no
//  upload — the URL is a data: URL that will appear in the form
//  but won't persist anywhere real).
// ─────────────────────────────────────────────────────────────

export default function ImageField({
  value,
  onChange,
  label,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setErr('');
    try {
      if (isMockMode()) {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = () => rej(new Error('Read failed'));
          r.readAsDataURL(file);
        });
        onChange(dataUrl);
      } else {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/admin/api/upload', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Upload failed.');
        }
        const j = await res.json();
        onChange(j.url);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 120,
            height: 96,
            background: value
              ? `url(${value}) center/cover`
              : 'repeating-linear-gradient(135deg, #ede4cc 0 3px, transparent 3px 8px) #fafaf7',
            border: '1px solid #d9cfb6',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {!value && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#5a524a',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              No image
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              style={{
                background: '#1c1813',
                color: '#fafaf7',
                border: 'none',
                padding: '8px 14px',
                fontSize: 12,
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput((s) => !s)}
              style={{
                background: '#ffffff',
                color: '#1c1813',
                border: '1px solid #d9cfb6',
                padding: '8px 14px',
                fontSize: 12,
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Or paste URL
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                style={{
                  background: '#ffffff',
                  color: '#b43e2e',
                  border: '1px solid #f0c1bb',
                  padding: '8px 14px',
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Remove
              </button>
            )}
          </div>
          {showUrlInput && (
            <input
              type="url"
              defaultValue={value ?? ''}
              placeholder="https://…"
              onBlur={(e) => {
                const v = e.target.value.trim();
                onChange(v || null);
                setShowUrlInput(false);
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #d9cfb6',
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 4,
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          )}
          {err && <div style={{ fontSize: 11, color: '#b43e2e' }}>{err}</div>}
          {value && (
            <div
              style={{
                fontSize: 10,
                color: '#5a524a',
                fontFamily: 'JetBrains Mono, monospace',
                wordBreak: 'break-all',
              }}
            >
              {value.length > 80 ? value.slice(0, 80) + '…' : value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
