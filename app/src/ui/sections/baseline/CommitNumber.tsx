import { useEffect, useState } from 'react';

interface CommitNumberProps { value: number; onCommit: (v: string) => void; label: string; step?: number; min?: number; className?: string }

/** Number field that keeps its own text while typing and commits on blur / Enter (like the legacy `onchange`), so partial input never reaches a controller. */
export function CommitNumber({ value, onCommit, label, step, min, className }: CommitNumberProps) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  const commit = () => { if (draft !== null) { onCommit(draft); setDraft(null); } };
  return (
    <input type="number" className={className} aria-label={label} step={step} min={min} value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} />
  );
}
