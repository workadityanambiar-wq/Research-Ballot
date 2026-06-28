'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onSave: (v: string) => Promise<void>;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

export default function RichEditor({ value, onSave, placeholder, minHeight = 240, readOnly = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Sync initial value into uncontrolled textarea
  useEffect(() => {
    if (ref.current && ref.current.value !== value) {
      ref.current.value = value ?? '';
    }
  }, [value]);

  const triggerSave = () => {
    if (readOnly || !ref.current) return;
    const v = ref.current.value;
    if (timer.current !== undefined) clearTimeout(timer.current);
    setStatus('saving');
    onSave(v).then(() => setStatus('saved')).catch(() => setStatus('idle'));
  };

  const handleChange = () => {
    if (readOnly) return;
    setStatus('idle');
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(triggerSave, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: 18 }}>
        {status === 'saving' && <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>⟳ SAVING…</span>}
        {status === 'saved' && <span style={{ fontSize: 10, color: 'var(--long)', fontFamily: 'var(--mono)' }}>✓ SAVED</span>}
      </div>
      <textarea
        ref={ref}
        className="inp"
        defaultValue={value ?? ''}
        onChange={handleChange}
        onBlur={triggerSave}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          minHeight,
          lineHeight: 1.8,
          fontSize: 13,
          resize: 'vertical',
          fontFamily: 'var(--sans)',
          opacity: readOnly ? 0.7 : 1,
        }}
      />
    </div>
  );
}
