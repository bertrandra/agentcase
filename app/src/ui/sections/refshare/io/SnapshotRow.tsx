import { useState } from 'react';
import type { NamedSnapshot } from '@/domain/snapshots';
import { Badge } from '@/ui/widgets/cards';
import { ConfirmButton } from '@/ui/widgets/CommitField';

interface Actions { onActivate: (id: string) => void; onDelete: (id: string) => void; onBaseline: (id: string) => void }

/** Baseline asks twice with two different prompts (it changes what a saved copy of the file starts from). The stage is view state. */
function BaselineButton({ onConfirm }: { onConfirm: () => void }) {
  const [stage, setStage] = useState(0);
  if (stage === 0) return <button type="button" onClick={() => setStage(1)}>🏁 Set as baseline</button>;
  if (stage === 1) return <span role="group" aria-label="Baseline step 1"><span className="ac-muted">⚠ This becomes the default state of the file you
    save next. Continue? </span><button type="button" onClick={() => setStage(2)}>Continue
    →</button> <button type="button" onClick={() => setStage(0)}>Cancel</button></span>;
  return <span role="group" aria-label="Baseline final confirmation"><strong>⚠ FINAL CONFIRMATION — replace the current baseline and activate it
    now? </strong><button type="button" data-tone="danger" onClick={() => { setStage(0); onConfirm(); }}>✓ Yes, set as
    baseline</button> <button type="button" onClick={() => setStage(0)}>Cancel</button></span>;
}

function RenameField({ name, onSave, onCancel }: { name: string; onSave: (n: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(name);
  return (
    <span role="group" aria-label="Rename snapshot">
      <input value={v} aria-label="New snapshot name" onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) onSave(v); if (e.key === 'Escape') onCancel(); }} />{' '}
      <button type="button" disabled={!v.trim()} onClick={() => onSave(v)}>Save</button> <button type="button" onClick={onCancel}>Cancel</button>
    </span>
  );
}

export function SnapshotName({ s, editing, onSave, onCancel }: { s: NamedSnapshot; editing: boolean; onSave: (n: string) => void; onCancel: () => void }) {
  return editing ? <RenameField name={s.name} onSave={onSave} onCancel={onCancel} /> : (
    <>
      <strong>{s.name}</strong>
      {s.protected && <> <Badge tone="amber">🔒 GOLDEN</Badge></>}
      {s.isAmeRef && <> <Badge tone="blue">🧪 AME REF</Badge></>}
      {s.wasGolden && <> <Badge>↩ FORMER GOLDEN</Badge></>}
      {s.isBaseline && <> <Badge tone="teal">🏁 BASELINE</Badge></>}
    </>
  );
}

export function SnapshotActions({ s, a, onRename }: { s: NamedSnapshot; a: Actions; onRename: () => void }) {
  const q = (n: string) => `${n} "${s.name}"`;
  return (
    <>
      <button type="button" className="ac-btn ac-btn-primary" aria-label={q('Activate')} onClick={() => a.onActivate(s.id)}>
        {s.protected ? '🔄 Reset to this' : '▶ Activate'}</button>{' '}
      <button type="button" className="ac-btn" aria-label={q('Rename')} onClick={onRename}>✏️ Rename</button>{' '}
      {s.protected ? <span className="ac-muted" title="The golden case is protected — it cannot be deleted">🔒 protected</span> : (
        <>
          <BaselineButton onConfirm={() => a.onBaseline(s.id)} />{' '}
          <ConfirmButton label="✕ Delete" confirmText={`Delete "${s.name}"?`} onConfirm={() => a.onDelete(s.id)} />
        </>
      )}
    </>
  );
}
