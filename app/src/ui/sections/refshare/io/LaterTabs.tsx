import content from '@/content/refshare/io.json';
import { Callout, Panel } from '@/ui/widgets/cards';

const T = content.texts;
const EXPORTS = [
  { label: '⬇️ Export all', hint: 'Full workbook — every sheet (parameters, team, scope, personas, Factory meta-model, …).' },
  { label: '⬇️ Export all except Factory', hint: 'Everything except the Factory meta-model (FM…) sheets.' },
  { label: '⬇️ Export persona config only', hint: 'Only the persona and section configuration sheets, including the dependency edges.' },
];

/** The Excel round-trip and the snapshot library: controls are shown, disabled, with an explicit note. */
export function LaterTabs({ which }: { which: 'settings' | 'snapshot' }) {
  if (which === 'snapshot') {
    return <Panel title={T.managerTitle}><p>{T.managerText}</p><button type="button" className="ac-btn" disabled>Capture current configuration</button></Panel>;
  }
  return (
    <div>
      <Callout kind="warn">{T.later}</Callout>
      <p>{T.settingsIntro}</p>
      <Panel title={T.exportTitle}>
        <p>{T.exportText}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{EXPORTS.map((x) => <button key={x.label} type="button" className="ac-btn" disabled title={x.hint}>{x.label}</button>)}</div>
      </Panel>
      <Panel title={T.importTitle}>
        <p>{T.importText}</p>
        <input type="file" accept=".xlsx" disabled aria-label="Settings workbook (.xlsx)" />
      </Panel>
    </div>
  );
}
