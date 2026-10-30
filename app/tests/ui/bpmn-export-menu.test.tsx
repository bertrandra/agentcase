// @vitest-environment jsdom
/** File menu > Export process (BPMN)… (docs/SPEC_BPMN.md F-B1, F-B3, F-B5; phase B2): the dialog, its keyboard and axe behaviour, the downloads. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopZone } from '@/ui/shell/TopZone';
import { uiStore } from '@/ui/uiState';
import { axeViolations } from '../helpers/axe';
import { loadCase } from '../helpers/pdc';
import { fourProducts } from '../helpers/portfolioFixtures';

const saved: { blob: Blob; name: string }[] = [];
beforeEach(() => {
  uiStore.setState({ activeSection: 'home', toast: '' }); saved.length = 0;
  let last: Blob | null = null;
  URL.createObjectURL = (b: Blob | MediaSource) => { last = b as Blob; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    if (last) saved.push({ blob: last, name: this.download });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const textOf = (b: Blob | undefined) => new Promise<string>((ok) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.readAsText(b ?? new Blob());
});
const openDialog = () => {
  render(<TopZone />);
  fireEvent.click(screen.getByRole('button', { name: 'File' }));
  fireEvent.click(screen.getByRole('menuitem', { name: /Export process \(BPMN\)/ }));
  return screen.getByRole('dialog', { name: 'Export process (BPMN)' });
};

describe('File menu: Export process (BPMN)', () => {
  // B9a (F-B69): the processes choice — delivery (default, the file of before), the transformation programme, or both in one file
  it('a single case: the in-scope option and the processes choice, focus on the option, axe clean; Export downloads one .bpmn file', async () => {
    loadCase('golden');
    const dlg = openDialog();
    expect(screen.getAllByRole('radio').map((r) => [r.parentElement?.textContent?.trim(), (r as HTMLInputElement).checked])).toEqual([
      ['Delivery process', true], ['Transformation programme', false], ['Both, in one file', false]]);
    const box = screen.getByRole('checkbox', { name: 'In-scope activities only' });
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saved.map((s) => [s.blob.type, /^AgentCase_process_.+_\d{4}-\d\d-\d\d\.bpmn$/.test(s.name)])).toEqual([['application/xml', true]]);
    expect(await textOf(saved[0]?.blob)).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<bpmn:definitions /);
    expect(dlg.isConnected).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'File' }));
  });
  it('Escape closes the dialog without exporting and returns focus to the File button', () => {
    loadCase('golden');
    fireEvent.keyDown(openDialog(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(saved).toEqual([]);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'File' }));
  });
  it('a portfolio: product shown, one file per product or one file with one pool per product; axe clean', async () => {
    fourProducts();
    openDialog();
    expect(screen.getAllByRole('radio').map((r) => r.parentElement?.textContent?.trim())).toEqual([
      expect.stringMatching(/^Product shown/), 'One file per product (4)', 'One file, one pool per product', 'Delivery process', 'Transformation programme',
      'Both, in one file']);
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole('radio', { name: /One file per product/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saved).toHaveLength(4);
    expect(new Set(saved.map((s) => s.name)).size).toBe(4);
  });
  it('the transformation programme alone, or both processes in one file', async () => {
    loadCase('golden');
    openDialog();
    fireEvent.click(screen.getByRole('radio', { name: 'Both, in one file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saved.map((s) => /^AgentCase_process_and_programme_.+\.bpmn$/.test(s.name))).toEqual([true]);
    const text = await textOf(saved[0]?.blob);
    expect([text.includes('<bpmn:process id="Process"'), text.includes('ac:programme="true"')]).toEqual([true, true]);
  });
});
