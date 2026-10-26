import { useState } from 'react';
import content from '@/content/refshare/datamodel.json';
import { APP_VERSION, versionTag } from '@/domain/version';
import { Badge, Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { useCounts } from './counts';
import { DocumentTab } from './DocumentTab';
import { FilesTab } from './FilesTab';
import { OverridesTab } from './OverridesTab';
import { Overview } from './Overview';
import { PackagesTab } from './PackagesTab';
import { ModelTab, SectionsTab, StateTab, VariablesTab } from './tables';
import { ViewStateTab } from './ViewStateTab';

/** Data Model — tables read off the registries, the runtime field lists and the persistence constants of this build. */
export default function DataModelSection() {
  const counts = useCounts(), [tab, setTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: '🧭 Overview', render: () => <Overview counts={counts} jump={setTab} /> },
    { id: 'sections', label: '📄 Sections', render: () => <SectionsTab /> },
    { id: 'state', label: '💾 State registry', render: () => <StateTab /> },
    { id: 'variables', label: '📊 Variable registry', render: () => <VariablesTab /> },
    { id: 'model', label: '⚙️ Coefficients & namespaces', render: () => <ModelTab /> },
    { id: 'document', label: '🗂️ Document', render: () => <DocumentTab /> },
    { id: 'overrides', label: '🎚️ Overridable keys', render: () => <OverridesTab /> },
    { id: 'view', label: '🔄 Document vs view', render: () => <ViewStateTab /> },
    { id: 'files', label: '💽 Files & workbooks', render: () => <FilesTab /> },
    { id: 'packages', label: '📦 Calculation packages', render: () => <PackagesTab /> },
  ];
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<>
        <p><Badge tone="blue">This build: {versionTag(APP_VERSION)}</Badge></p>
        <Callout>Every table is read live from the code of this build: the zone registry (sections), the keys of the case in the store (state), the
          variable listing, the model defaults (<code>COEF</code>, <code>MODEL</code>), the runtime twins of the portfolio types, the view fields, and the
          name constants of the file writers. A field added in the code appears here on the next reload.</Callout>
      </>}
      result={<>
        <p><b>{counts.sections}</b> sections · <b>{counts.state}</b> case keys · <b>{counts.variables}</b> bindable variables
          · <b>{counts.coefs}</b> coefficients · <b>{counts.namespaces}</b> model namespaces · <b>{counts.view}</b> view fields
          · <b>{counts.sheets}</b> workbook sheets</p>
        <Tabs key={tab} tabs={tabs} label="Data model tables" initial={tab} />
      </>} />
  );
}
