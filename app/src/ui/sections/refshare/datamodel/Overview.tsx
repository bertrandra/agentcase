import { Badge } from '@/ui/widgets/cards';
import { tagCounts } from './model';

export interface Counts {
  sections: number; state: number; variables: number; coefs: number; namespaces: number;
  levels: number; view: number; overridable: number; sheets: number; packageFields: number;
}
interface Card { tab: string; n: (c: Counts) => string; title: string; text: string }

/** The four registries of a case; each card's tone is its `data-layer` rule in sections-b.css. */
const REGISTRIES: Card[] = [
  { tab: 'sections', n: (c) => String(c.sections), title: '📄 Sections', text: 'Every tab in the app — what exists, which menu group it lives in, and its build-path tag.' },
  { tab: 'state', n: (c) => String(c.state), title: '💾 State registry', text: 'The keys of the case the sections read: what a snapshot, the autosave and the Excel round-trip carry.' },
  { tab: 'variables', n: (c) => String(c.variables), title: '📊 Variable registry', text: 'Named, formatted, bindable outputs a KPI card or Board tile can point at instead of a hand-wired getter.' },
  { tab: 'model', n: (c) => `${c.coefs} + ${c.namespaces}`, title: '⚙️ Coefficients & namespaces', text: 'The small tunable constants embedded in the maths, and the MODEL namespaces holding everything not a per-section input.' },
];

/** The document around the case: the portfolio, its view state, its files and its calculation packages. */
const DOCUMENT: Card[] = [
  { tab: 'document', n: (c) => String(c.levels), title: '🗂️ Document hierarchy', text: 'Portfolio → common case, products, waves, shared team lines, hub: the fields of each level.' },
  { tab: 'overrides', n: (c) => String(c.overridable), title: '🎚️ Overridable keys', text: 'Which keys of the common case a product can hold for itself, and which stay common.' },
  { tab: 'view', n: (c) => String(c.view), title: '🔄 Document vs view', text: 'What is undone, saved and broadcast — and what stays in the tab. Autosave record and tab messages.' },
  { tab: 'files', n: (c) => String(c.sheets), title: '💽 Files & workbooks', text: 'The file formats, the schema version and migrations, and every sheet of the three workbooks.' },
  { tab: 'packages', n: (c) => String(c.packageFields), title: '📦 Calculation packages', text: 'The engine identity and key figures stamped into a saved case, and which ones opening a file compares.' },
];

function Cards({ cards, counts, jump }: { cards: Card[]; counts: Counts; jump: (tab: string) => void }) {
  return (
    <div className="ac-dm-cards">
      {cards.map((c) => (
        <button key={c.tab} type="button" className="ac-chip ac-dm-card" data-layer={c.tab} onClick={() => jump(c.tab)}>
          <div className="ac-dm-card-n">{c.n(counts)}</div>
          <div className="ac-dm-card-t">{c.title}</div>
          <div className="ac-muted">{c.text}</div>
        </button>
      ))}
    </div>
  );
}

/** The registries and the document layers as clickable cards, plus the tag tally. */
export function Overview({ counts, jump }: { counts: Counts; jump: (tab: string) => void }) {
  return (
    <div>
      <h2>The four layers</h2>
      <p className="ac-muted">Click a card to jump to its table. Together they answer four different questions: what exists (Sections), what a case holds (State), what a dashboard can display (Variables), and what small numbers actually drive the maths (Coefficients & namespaces).</p>
      <Cards cards={REGISTRIES} counts={counts} jump={jump} />
      <p className="ac-dm-tags">Sections by build-path tag: {tagCounts().map(([t, n]) => <Badge key={t}>{t} × {n}</Badge>)}</p>
      <h2>The document and its files</h2>
      <p className="ac-muted">A case is one product of a portfolio. These tables answer what the store holds around it, what belongs to the tab rather than to the document, and what each file format carries.</p>
      <Cards cards={DOCUMENT} counts={counts} jump={jump} />
      <p className="ac-muted">All counts on this page are computed from the live registries and the runtime field lists of this build.</p>
    </div>
  );
}
