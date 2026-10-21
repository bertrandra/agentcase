import type { ComponentType } from 'react';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { produce } from 'immer';
import { createAppStore } from '@/store/core';
import { refitPotential } from '@/store/derive';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { simStore } from '@/store/simulation';
import { loadCase } from './extras';
import { legacySectionText, missingNumbers, renderedText } from './parity';

export const PARITY_FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];

/**
 * Install a store on a fixture case (the document a user would have opened) and forget any previous simulation.
 * Like the legacy snapshot loader, opening re-fits the automation potential to the scope when "fit to scope" is on.
 */
export function openFixture(id: string) {
  const s = createAppStore(produce(fromSnapshot(loadCase(id)), (d) => { refitPotential(d); }));
  setAppStore(s);
  simStore.setState({ run: null });
  return s;
}

/** Legacy figures missing from the rendered section, for one fixture (an empty list is parity). */
export function missingFor(Cmp: ComponentType, section: string, fixture: string, ignore: number[] = []): number[] {
  openFixture(fixture);
  const legacy = legacySectionText(fixture, section);
  if (legacy == null) throw new Error(`no legacy text for ${section}/${fixture}`);
  const { container, unmount } = render(createElement(Cmp));
  // tabs and line breaks separate cells: the shared tokenizer would otherwise fuse a figure with the next cell (€1,498,686⇥1110% → 1498686111)
  const miss = missingNumbers(legacy.replace(/[\t\n]+/g, '  '), renderedText(container), ignore);
  unmount();
  return miss;
}
