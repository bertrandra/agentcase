import { useState } from 'react';
import { editAudit, editToolCatalog, today } from '@/controllers/audit';
import {
  AI_USES, capabilityKey, CAPABILITIES, deliverableKinds, HOSTINGS, proposedByType, proposedTools, type CatalogTool, type ToolUse,
} from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';

const LIMIT = 40;
const slug = (s: string): string => `client-${s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}`;

/** One tool in use: AI use, integration, version, licences, hosting (§ 15.3 "Tools"). */
function UseRow({ id, use, name }: { id: string; use: ToolUse; name: string }) {
  const set = (patch: Partial<ToolUse>) => { if (!editAudit(id, { kind: 'tool', use: { ...use, ...patch } })) toast(`${name}: value refused`); };
  const undef = (v: string) => v || undefined;
  return (
    <tr>
      <th scope="row">{name}</th>
      <td><select aria-label={`${name}: AI features enabled`} value={use.aiFeatures ?? ''}
        onChange={(e) => set({ aiFeatures: undef(e.target.value) as ToolUse['aiFeatures'] })}>
        <option value="">—</option>{AI_USES.map((v) => <option key={v} value={v}>{v}</option>)}</select></td>
      <td><DraftText label={`${name}: integration used (api webhook cli mcp export manual)`} value={(use.integration ?? []).join(' ')}
        onCommit={(v) => set({ integration: v.split(/[\s,]+/).filter(Boolean) })} /></td>
      <td><DraftText label={`${name}: version or edition`} value={use.version ?? ''} onCommit={(v) => set({ version: undef(v.trim()) })} /></td>
      <td><DraftText label={`${name}: licence count`} value={use.licenceCount === undefined ? '' : String(use.licenceCount)}
        onCommit={(v) => set({ licenceCount: v.trim() ? Number(v) : undefined })} /></td>
      <td><select aria-label={`${name}: hosting`} value={use.hosting ?? ''} onChange={(e) => set({ hosting: undef(e.target.value) })}>
        <option value="">—</option>{HOSTINGS.map((v) => <option key={v} value={v}>{v}</option>)}</select></td>
      <td><button type="button" aria-label={`Remove ${name}`} onClick={() => editAudit(id, { kind: 'removeTool', ref: use.ref })}>✕</button></td>
    </tr>
  );
}

/**
 * The tools of an activity (F-B24): the catalogue's tools that serve its capability (by category, with a search box), ticked when in use, and
 * a client-specific tool added to the case's catalogue (then offered for every activity of the same capability).
 */
export function Tools({ data, id, uses, capability }: { data: AuditViewData; id: string; uses: ToolUse[]; capability?: string }) {
  const [q, setQ] = useState(''), [name, setName] = useState('');
  const offer = proposedTools(data.catalog, capability, q), names = new Map(data.catalog.map((t) => [t.code, t.name])), inUse = new Set(uses.map((u) => u.ref));
  const kinds = deliverableKinds(data.doc, id), byType = proposedByType(data.catalog, kinds, capability, q);
  const tick = (code: string, on: boolean) => editAudit(id, on ? { kind: 'tool', use: { ref: code, date: today() } } : { kind: 'removeTool', ref: code });
  const cap = CAPABILITIES.find((c) => capabilityKey(c) === capabilityKey(capability)) ?? 'Planning';
  const add = () => {
    const code = slug(name);
    const ok = editToolCatalog({ kind: 'upsert', tool: { code, name, capabilities: [cap], licence: [], aiFeatures: [], integration: [], hosting: [],
      clientSpecific: true, retired: false } }) && tick(code, true);
    toast(ok ? `${name} added as a client-specific tool (Ctrl+Z undoes)` : 'Tool refused: a name is needed');
    if (ok) setName('');
  };
  return (
    <fieldset className="ac-audit-block">
      <legend>Tools in use</legend>
      {uses.length > 0 && <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th scope="col">Tool</th><th scope="col">AI features</th><th scope="col">Integration</th><th scope="col">Version</th>
          <th scope="col">Licences</th><th scope="col">Hosting</th><th scope="col"><span className="ac-sr">Remove</span></th></tr></thead>
        <tbody>{uses.map((u) => <UseRow key={u.ref} id={id} use={u} name={names.get(u.ref) ?? u.ref} />)}</tbody>
      </table></div>}
      <p className="ac-muted">Proposed for the capability {capability || '(none: every tool)'}: {offer.length} tool(s), a neutral list, never a
        recommendation.</p>
      <label>Search the catalogue <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, vendor or category" /></label>
      <ToolList tools={offer} inUse={inUse} tick={tick} />
      {byType.length > 0 && <>
        <p className="ac-muted">Also proposed for its deliverables ({kinds.join(', ')}): {byType.length} tool(s).</p>
        <ToolList tools={byType} inUse={inUse} tick={tick} label="Tools proposed for the deliverables" />
      </>}
      <div className="ac-form-row">
        <input type="text" aria-label="Client-specific tool name" placeholder="Tool not in the catalogue" value={name}
          onChange={(e) => setName(e.target.value)} />
        <button type="button" disabled={!name.trim()} onClick={add}>+ Add a client-specific tool</button>
      </div>
    </fieldset>
  );
}

function ToolList({ tools, inUse, tick, label }: { tools: CatalogTool[]; inUse: Set<string>; tick: (code: string, on: boolean) => unknown; label?: string }) {
  return (
    <ul className="ac-audit-tools" aria-label={label}>{tools.slice(0, LIMIT).map((t) => (
      <li key={t.code}><label><input type="checkbox" checked={inUse.has(t.code)} onChange={(e) => tick(t.code, e.target.checked)} />
        {' '}{t.name}<span className="ac-muted"> · {t.vendor ?? 'client-specific'} · {t.category ?? ''}</span></label></li>))}</ul>
  );
}
