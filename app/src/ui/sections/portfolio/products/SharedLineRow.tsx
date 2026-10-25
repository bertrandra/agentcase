import { LOCATIONS } from '@/domain';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import { allocatedPct, type Product, type SharedLineField, type SharedTeamLine } from '@/domain/portfolio';
import { removeSharedLine, setSharedShare, updateSharedLine } from '@/controllers/sharedTeam';
import { toast } from '@/ui/uiState';
import { NumCell } from '@/ui/widgets/CommitField';

const LOC_NAMES = LOCATIONS.map((l) => l.name);
const LISTS: [SharedLineField, string, string[]][] = [['skill', 'Skill', SKILLS_EXIST], ['grade', 'Grade', GRADES], ['loc', 'Location', LOC_NAMES]];
const pctText = (x: number): string => `${+x.toFixed(2)} %`;

interface Props { line: SharedTeamLine; index: number; products: Product[]; open: boolean; onPin: (id: string) => void }

/** One shared line: skill / grade / location / FTE, one share (percent of the line's FTE) per product, the allocated total, pins and removal. */
export function SharedLineRow({ line, index, products, open, onPin }: Props) {
  const who = `shared line ${index + 1}`, sum = allocatedPct(line), over = sum > 100 + 1e-9, known = new Set(products.map((p) => p.id));
  const orphans = Object.keys(line.allocations).filter((id) => !known.has(id)), pins = line.pins?.length ?? 0;
  return (
    <tr data-shared={line.id}>
      {LISTS.map(([field, name, list]) => (
        <td key={field}>
          <select aria-label={`${name} of ${who}`} value={line[field]} onChange={(e) => { updateSharedLine(line.id, field, e.target.value); }}>
            {list.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </td>
      ))}
      <td className="ac-num"><NumCell ariaLabel={`FTE of ${who}`} value={line.etp} min={0} step={0.5} width={64}
        onCommit={(v) => { updateSharedLine(line.id, 'etp', v); }} /></td>
      {products.map((p) => (
        <td key={p.id} className="ac-num">
          <NumCell ariaLabel={`Share of ${p.name} in ${who} (%)`} value={line.allocations[p.id] ?? 0} min={0} max={100} step={5} width={64}
            onCommit={(v) => { setSharedShare(line.id, p.id, parseFloat(v) || 0); }} />
        </td>
      ))}
      <td className="ac-num">
        <b className="ac-tone" data-tone={over ? 'danger-800' : 'slate-700'}>{pctText(sum)}</b>
        {over && <span className="ac-sr"> (more than 100 %: counted more than once)</span>}
        {orphans.map((id) => (
          <button key={id} type="button" className="ac-link" onClick={() => { setSharedShare(line.id, id, 0); }}>Clear the share of deleted product {id}</button>
        ))}
      </td>
      <td>
        <button type="button" aria-pressed={open} aria-label={`Pin ${who}`} title={pins ? `${pins} pinned artefact${pins === 1 ? '' : 's'}` : 'Auto: no pin'}
          onClick={() => onPin(line.id)}>📌{pins ? ` ${pins}` : ''}</button>
      </td>
      <td>
        <button type="button" aria-label={`Remove ${who}`}
          onClick={() => toast(removeSharedLine(line.id) ? 'Shared line removed — Ctrl+Z to undo' : 'Shared line not found')}>×</button>
      </td>
    </tr>
  );
}
