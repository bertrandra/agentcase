import { useEffect, useId, useRef } from 'react';
import { importProcess, previewProcessImport } from '@/controllers/processImport';
import type { ImportChoices } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { Mapping } from './ImportMapping';
import { cancelImport, choose, importDone, useProcessView } from './view';

/** A list of ids, shortened past 12 (the full list is in the report's details). */
const ids = (xs: string[]): string => (xs.length > 12 ? `${xs.slice(0, 12).join(', ')}… (+${xs.length - 12})` : xs.join(', '));

/**
 * The import preview (spec F-B7, F-B8, D-B4, D-B10): the mode (replace / merge), what happens to the case's other activities, the file's
 * out-of-scope activities, the mapping of unknown units and roles, and the outcome by kind before anything is written. "Import" is one undoable
 * step; "Cancel" leaves the case untouched.
 */
export function ImportPanel() {
  const read = useProcessView((s) => s.read), c = useProcessView((s) => s.choices), id = useId(), head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus(); }, [read]);
  if (!read) return null;
  const a = read.analysis, p = previewProcessImport(a, c);
  const radio = <K extends 'mode' | 'missing' | 'fileOutOfScope'>(k: K, v: ImportChoices[K], label: string) => (
    <label><input type="radio" name={`${id}-${k}`} checked={c[k] === v} onChange={() => choose({ [k]: v } as Partial<ImportChoices>)} /> {label}</label>
  );
  const run = () => {
    const r = importProcess(read, c);
    if (!r) { toast('The import is not ready: complete the mapping first', 4000); return; }
    importDone(r);
    toast(`Imported ${read.name} (Ctrl+Z undoes)`);
  };
  const blocked = !!p.refusal || p.unmappedUnits.length > 0 || p.unmappedRoles.length > 0;
  const rows: [string, string[]][] = [['Added', p.added], ['Updated', p.updated], ['Switched out of scope', p.outOfScope], ['Removed', p.removed],
    ['Left out (out of scope in the file)', p.skipped], ['Parameters to review (defaulted)', p.defaulted]];
  return (
    <section className="ac-proc-import" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} ref={head} tabIndex={-1}>Import {read.name}</h2>
      <p>{a.agentcase ? 'A process written by AgentCase' : 'A process written by another tool: its tasks are mapped onto the phases and roles of the case'}
        {a.partial ? ' (in-scope activities only)' : ''} — {a.tasks.length} activities.</p>
      {read.warnings.length > 0 && <p className="ac-proc-warn">Warnings: {read.warnings.join('; ')}</p>}
      <div className="ac-proc-choices">
        <fieldset><legend>Mode</legend>
          {radio('mode', 'merge', 'Merge into the case\'s process')}
          {radio('mode', 'replace', a.agentcase ? 'Replace the case\'s process by the file' : 'Replace the case\'s activities by the file\'s')}
        </fieldset>
        {c.mode === 'merge' && (
          <fieldset><legend>Activities of the case missing from the file</legend>
            {radio('missing', 'keep', 'Keep them as they are')}
            {radio('missing', 'outOfScope', 'Switch them out of scope')}
          </fieldset>
        )}
        <fieldset><legend>Out-of-scope activities of the file</legend>
          {radio('fileOutOfScope', 'include', 'Import them, out of scope')}
          {radio('fileOutOfScope', 'skip', 'Leave them out')}
        </fieldset>
      </div>
      {!(a.agentcase && c.mode === 'replace') && <Mapping analysis={a} choices={c} />}
      <table className="ac-table ac-proc-preview">
        <caption>What the import will do</caption>
        <thead><tr><th scope="col">Outcome</th><th scope="col">Activities</th><th scope="col">Ids</th></tr></thead>
        <tbody>{rows.map(([k, xs]) => <tr key={k}><th scope="row">{k}</th><td>{xs.length}</td><td>{ids(xs)}</td></tr>)}</tbody>
      </table>
      {p.newRoles.length > 0 && <p>New roles: {p.newRoles.map((r) => `${r.name} → ${r.teamSkill}`).join(', ')}</p>}
      <p role="status" className={blocked ? 'ac-proc-warn' : 'ac-muted'}>
        {p.refusal ?? (blocked ? `Map ${[...p.unmappedUnits, ...p.unmappedRoles].join(', ')} first.` : 'Ready: the import is one step, undone by Ctrl+Z.')}
      </p>
      <div className="ac-form-row">
        <button type="button" className="ac-btn" disabled={blocked} onClick={run}>Import</button>
        <button type="button" className="ac-btn" onClick={cancelImport}>Cancel</button>
      </div>
    </section>
  );
}
