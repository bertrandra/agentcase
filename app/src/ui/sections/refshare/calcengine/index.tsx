import content from '@/content/refshare/calcengine.json';
import { Badge, Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Engines } from './Engines';
import { TimeEngine } from './TimeEngine';

/** Calculation Engine — read-only reference of the TypeScript engine (src/domain): function surface, overlay contract, engines. */
export default function CalcEngineSection() {
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <p><Badge tone="blue">{content.version}</Badge></p>
        <Callout>The machinery behind the numbers, introspected: the ⏱️ Time Engine's function surface, its <code>model()</code> overlay contract and which sections actually call it — plus what replaced the DEP invalidation graph and the AUDIT invariant registry. This page describes the new TypeScript engine (<code>src/domain</code>); the help text keeps the legacy explanations that remain true.</Callout>
      </>}
      result={<Tabs label="Calculation engine" tabs={[
        { id: 'time', label: '⏱️ Time Engine', render: () => <TimeEngine /> },
        { id: 'engines', label: '⚙️ Engines', render: () => <Engines /> },
      ]} />} />
  );
}
