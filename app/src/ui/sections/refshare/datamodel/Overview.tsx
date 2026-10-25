import { Badge } from '@/ui/widgets/cards';
import { tagCounts } from './model';

export interface Counts { sections: number; state: number; variables: number; coefs: number; namespaces: number }

/** The four layers; each card's tone is its `data-layer` rule in sections-b.css. */
const CARDS = [
  { tab: 'sections', n: (c: Counts) => String(c.sections), title: '📄 Sections', text: 'Every tab in the app — what exists, which menu group it lives in, and its build-path tag.' },
  { tab: 'state', n: (c: Counts) => String(c.state), title: '💾 State registry', text: 'What actually persists — snapshot save/restore, autosave, Excel. Missing from here = lost on reload.' },
  { tab: 'variables', n: (c: Counts) => String(c.variables), title: '📊 Variable registry', text: 'Named, formatted, bindable outputs a KPI card or Board tile can point at instead of a hand-wired getter.' },
  { tab: 'model', n: (c: Counts) => `${c.coefs} + ${c.namespaces}`, title: '⚙️ Coefficients & namespaces', text: 'The small tunable constants embedded in the maths, and the MODEL namespaces holding everything not a per-section input.' },
];

/** The four layers as clickable cards, plus the tag tally. */
export function Overview({ counts, jump }: { counts: Counts; jump: (tab: string) => void }) {
  return (
    <div>
      <h2>The four layers</h2>
      <p className="ac-muted">Click a card to jump to its table. Together they answer four different questions: what exists (Sections), what survives a reload (State), what a dashboard can display (Variables), and what small numbers actually drive the maths (Coefficients & namespaces).</p>
      <div className="ac-dm-cards">
        {CARDS.map((c) => (
          <button key={c.tab} type="button" className="ac-chip ac-dm-card" data-layer={c.tab} onClick={() => jump(c.tab)}>
            <div className="ac-dm-card-n">{c.n(counts)}</div>
            <div className="ac-dm-card-t">{c.title}</div>
            <div className="ac-muted">{c.text}</div>
          </button>
        ))}
      </div>
      <p className="ac-dm-tags">Sections by build-path tag: {tagCounts().map(([t, n]) => <Badge key={t}>{t} × {n}</Badge>)}</p>
      <p className="ac-muted">All counts on this page are computed from the live registries of this build — the section catalogue, the document keys, the variable registry and the model defaults.</p>
    </div>
  );
}
