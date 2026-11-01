import { VARIABLES } from '@/domain/pdc/variables';
import { useCtx } from '@/store/hooks';
import { sectionById } from '@/ui/zones/registry';
import { formatValue } from './format';
import { useVarRuntime } from './runtime';

/** Every variable available to bind: its source section, label, format and live value. */
export function Catalog() {
  const c = useCtx(), rt = useVarRuntime();
  return (
    <>
      <p className="ac-muted">Reference: every variable available to bind, its Source section (set a card/row’s Source to that section to unlock it), and its
        live value.</p>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Source</th><th>Variable</th><th>Format</th><th>Unit</th><th>Live value</th></tr></thead>
        <tbody>
          {VARIABLES.map((v) => {
            let text: string;
            try { text = formatValue(v.get(c, rt), v.format); } catch { text = '—'; }
            return <tr key={v.id}><td>{v.scope === 'GLOBAL' ? 'GLOBAL' : (sectionById(v.scope)?.label ?? v.scope)}</td><td>{v.label}</td>
              <td><code>{v.format}</code></td><td>{v.unit}</td><td className="ac-num ac-value">{text}</td></tr>;
          })}
        </tbody>
      </table></div>
    </>
  );
}
