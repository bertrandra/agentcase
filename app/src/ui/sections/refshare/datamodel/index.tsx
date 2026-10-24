import { useState } from 'react';
import content from '@/content/refshare/datamodel.json';
import { useSavedCase } from '@/store/portfolioHooks';
import { Badge, Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SECTIONS } from '@/ui/zones/registry';
import { COEF_ROWS, NS_ROWS, VARIABLES } from './model';
import { Overview } from './Overview';
import { ModelTab, SectionsTab, StateTab, VariablesTab } from './tables';

/** Data Model — four tables read off the registries of this build: sections, persisted state, bindable variables, coefficients and namespaces. */
export default function DataModelSection() {
  const keys = Object.keys(useSavedCase()).length, [tab, setTab] = useState('overview');
  const counts = { sections: SECTIONS.length, state: keys, variables: VARIABLES.length, coefs: COEF_ROWS.length, namespaces: NS_ROWS.length };
  const tabs = [
    { id: 'overview', label: '🧭 Overview', render: () => <Overview counts={counts} jump={setTab} /> },
    { id: 'sections', label: '📄 Sections', render: () => <SectionsTab /> },
    { id: 'state', label: '💾 State registry', render: () => <StateTab /> },
    { id: 'variables', label: '📊 Variable registry', render: () => <VariablesTab /> },
    { id: 'model', label: '⚙️ Coefficients & namespaces', render: () => <ModelTab /> },
  ];
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <p><Badge tone="blue">{content.version}</Badge></p>
        <Callout>In this build the tables read the <code>zone registry</code> (sections), the keys of the document in the store (state), the variable
          listing in <code>content/refshare/variables.json</code> and the model defaults (<code>COEF</code>, <code>MODEL</code>). The help text below
          describes the legacy registries they replace.</Callout>
      </>}
      result={<>
        <p><b>{counts.sections}</b> sections · <b>{counts.state}</b> persisted state keys · <b>{counts.variables}</b> bindable variables · <b>{counts.coefs}</b> coefficients · <b>{counts.namespaces}</b> model namespaces</p>
        <Tabs key={tab} tabs={tabs} label="Data model tables" initial={tab} />
      </>} />
  );
}
