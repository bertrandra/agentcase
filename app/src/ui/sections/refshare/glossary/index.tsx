import { useState } from 'react';
import content from '@/content/refshare/glossary.json';
import { toast } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { TabPanel, TabStrip, useStripBase } from '@/ui/widgets/TabStrip';
import { Rich } from '@/ui/widgets/Rich';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { downloadText } from '../download';
import { GlossaryTable } from './GlossaryTable';
import { CATS, ENTRIES, filterGlossary, glossaryMarkdown } from './model';

/** Delivery-model glossary — searchable, filterable by dimension, exportable as Markdown. */
export default function GlossarySection() {
  const [query, setQuery] = useState(''), [cat, setCat] = useState('all');
  const shown = filterGlossary(cat, query), base = useStripBase();
  const exportMd = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`AgentCase_DeliveryModel_Glossary_${stamp.replace(/-/g, '')}.md`, glossaryMarkdown(stamp), 'text/markdown');
    toast(`Glossary exported (${ENTRIES.length} terms)`);
  };
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <Callout>Every term of the delivery-model referential lives here, mapped to its AgentCase equivalent and tagged: <b>Aligned</b> (same
          concept), <b>Mapped in AgentCase</b> (implemented as a feature), <b>AgentCase strength</b> (quantification the referential lacks). Use it as
          the shared language between COMEX and delivery conversations.</Callout>
        <div className="ac-gloss-bar">
          <input type="search" className="ac-search" placeholder="🔍 Search a term or definition…" aria-label="Search a term or definition" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="ac-btn ac-btn-primary" onClick={exportMd}>⬇️ Export glossary (.md)</button>
        </div>
        <TabStrip base={base} label="Glossary dimensions" value={cat} onChange={setCat} tabs={[{ id: 'all', label: 'All' }, ...CATS].map((c) => ({ id: c.id, label: `${c.label} (${c.id === 'all' ? ENTRIES.length : ENTRIES.filter((e) => e[0] === c.id).length})` }))} />
      </>}
      result={<TabPanel base={base} current={cat}><p className="ac-muted" aria-live="polite">{shown.length} term(s) shown</p><GlossaryTable rows={shown} /></TabPanel>} />
  );
}
