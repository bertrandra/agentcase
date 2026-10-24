import { useRef } from 'react';

/**
 * The Save / Open button pair of a file panel: the primary button saves, the second opens the hidden file input (the value is reset so the same file
 * can be reopened).
 */
export function SaveOpenButtons({ save, open, accept, fileLabel, onSave, onOpen }: {
  save: string; open: string; accept: string; fileLabel: string; onSave: () => void; onOpen: (f: File | undefined) => Promise<void>;
}) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className="ac-btn ac-btn-primary" onClick={onSave}>{save}</button>
      <button type="button" className="ac-btn" onClick={() => file.current?.click()}>{open}</button>
      <input ref={file} type="file" accept={accept} aria-label={fileLabel} hidden onChange={(e) => { void onOpen(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
