import { OVERLAY_CONTROLS } from '@/domain/pdc/boardRows';
import { variablesForSection } from '@/domain/pdc/variables';
import { LazySelect, type Opt } from '@/ui/widgets/LazySelect';
import { SECTIONS, sectionById } from '@/ui/zones/registry';
import { FORMAT_IDS } from './format';

const scopeLabel = (s: string) => (s === 'GLOBAL' ? 'GLOBAL' : (sectionById(s)?.label.replace(/^\S+\s/, '') ?? s));
const SECTION_OPTS: Opt[] = [...SECTIONS].sort((a, b) => a.label.localeCompare(b.label)).map((s) => ({ value: s.id, label: s.label }));
const FORMAT_OPTS: Opt[] = FORMAT_IDS.map((f) => ({ value: f, label: f }));
const OVERLAY_OPTS: Opt[] = OVERLAY_CONTROLS.map((o) => ({ value: o.id, label: o.label }));

/** Variables of `source` (its own plus the GLOBAL ones): set the Source first, it decides what can be picked. Lists build only while choosing. */
export function VarPicker({ source, value, label, onChange }: { source: string | null | undefined; value: string | null | undefined; label: string;
  onChange: (v: string | null) => void }) {
  const options = variablesForSection(source ?? '').map((v) => ({ value: v.id, label: `[${scopeLabel(v.scope)}] ${v.label}` }));
  return <LazySelect ariaLabel={label} value={value ?? ''} options={options} emptyLabel="—" onChange={(v) => onChange(v || null)} />;
}

/** Display format override; "(auto)" adopts the variable's canonical format. */
export function FmtPicker({ value, label, onChange }: { value: string | null | undefined; label: string; onChange: (v: string | null) => void }) {
  return <LazySelect ariaLabel={label} value={value ?? ''} options={FORMAT_OPTS} emptyLabel="(auto)" onChange={(v) => onChange(v || null)} />;
}

/** A section of the app; "—" (only meaningful for a card target) clears it. */
export function SectionPicker({ value, label, onChange }: { value: string | null | undefined; label: string; onChange: (v: string) => void }) {
  const options = value && !sectionById(value) ? [{ value, label: value }, ...SECTION_OPTS] : SECTION_OPTS;
  return <LazySelect ariaLabel={label} value={value ?? ''} options={options} emptyLabel="—" onChange={onChange} />;
}

export function OverlayPicker({ value, label, onChange }: { value: string | null | undefined; label: string; onChange: (v: string | null) => void }) {
  return <LazySelect ariaLabel={label} value={value ?? ''} options={OVERLAY_OPTS} emptyLabel="(always active)" onChange={(v) => onChange(v || null)} />;
}
