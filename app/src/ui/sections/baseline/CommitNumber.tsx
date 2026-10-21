import { useEffect, useState } from 'react';

/** Number field that keeps its own text while typing and commits on blur / Enter (like the legacy `onchange`), so partial input never reaches a controller. */
export function CommitNumber({ value, onCommit, label, step, min, width }: { value: number; onCommit: (v: string) => void; label: string; step?: number; min?: number; width?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  const commit = () => { if (draft !== null) { onCommit(draft); setDraft(null); } };
  return (
    <input type="number" aria-label={label} step={step} min={min} style={width ? { width } : undefined} value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} />
  );
}
