import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { expect } from 'vitest';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { legacySectionText, missingNumbers, renderedText } from './parity';

export const FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];

/** Install the application store loaded from a legacy fixture case. */
export function loadFixture(id: string): void {
  setAppStore(createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')))));
}

/** Legacy lines (headings) of a section's text that are short titles: emoji-led or title-cased lines without sentence punctuation. */
export function legacyHeadings(text: string, only?: string[]): string[] {
  const all = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 3 && l.length < 70 && !/[.:;]$/.test(l) && !/^\d+$/.test(l));
  return only ?? all.slice(0, 1);
}

/** Parity of one section against the four fixtures: every legacy figure and the given headings appear in the rendered text. */
export function expectParity(id: string, Section: ComponentType, opts: { ignore?: number[]; headings?: string[] } = {}): void {
  for (const fx of FIXTURES) {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, id);
    expect(legacy, `${fx}/${id}`).not.toBeNull();
    const shown = renderedText(container);
    expect(missingNumbers(legacy!, shown, opts.ignore ?? []), `${fx}/${id} numbers`).toEqual([]);
    for (const h of opts.headings ?? legacyHeadings(legacy!)) expect(shown, `${fx}/${id} heading "${h}"`).toContain(h);
    cleanup();
  }
}
