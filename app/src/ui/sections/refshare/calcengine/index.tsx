import content from '@/content/refshare/calcengine.json';
import { APP_VERSION, versionTag } from '@/domain/version';
import { Badge, Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Engines } from './Engines';
import { SingleSources } from './SingleSources';
import { TimeEngine } from './TimeEngine';

/** Calculation Engine — read-only reference of the TypeScript engine (src/domain): function surface, overlay contract, engines. */
export default function CalcEngineSection() {
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <p><Badge tone="blue">This build: {versionTag(APP_VERSION)}</Badge></p>
        <Callout>The machinery behind the numbers, introspected: the ⏱️ Time Engine's function surface, its <code>model()</code> overlay contract and
          which sections actually call it — the single sources of truth (one owner per figure, one cash-flow kernel, one payback rule, one split
          rule, one horizon reader, one portfolio consolidation) — plus what replaced the DEP invalidation graph and the AUDIT invariant registry.
          This page describes the TypeScript engine (<code>src/domain</code>).</Callout>
      </>}
      result={<Tabs label="Calculation engine" tabs={[
        { id: 'time', label: '⏱️ Time Engine', render: () => <TimeEngine /> },
        { id: 'sources', label: '📏 Single sources', render: () => <SingleSources /> },
        { id: 'engines', label: '⚙️ Engines', render: () => <Engines /> },
      ]} />} />
  );
}
