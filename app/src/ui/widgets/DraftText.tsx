import { useState } from 'react';

/**
 * A text the user edits as a whole: the draft is view state and goes to the controller on blur or Enter (Escape drops it), so names are trimmed
 * once, not at every keystroke. The committed value is read back from the document.
 */
export function DraftText({ value, onCommit, label, placeholder }: { value: string; onCommit: (v: string) => void; label: string; placeholder?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => { if (draft !== null && draft !== value) onCommit(draft); setDraft(null); };
  return (
    <input type="text" aria-label={label} placeholder={placeholder} value={draft ?? value} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); else if (e.key === 'Escape') setDraft(null); }} />
  );
}
