// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axeViolations } from '../helpers/axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopZone } from '@/ui/shell/TopZone';
import { uiStore } from '@/ui/uiState';
import { loadCase } from '../helpers/pdc';

const saved: Blob[] = [];
beforeEach(() => {
  uiStore.setState({ activeSection: 'home', toast: '' }); loadCase('golden'); saved.length = 0;
  URL.createObjectURL = (b: Blob | MediaSource) => { saved.push(b as Blob); return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const fileBtn = () => screen.getByRole('button', { name: 'File' });

describe('top bar file menu', () => {
  it('is an icon-only menu button; Save and Open are no longer loose buttons', () => {
    render(<TopZone />);
    expect(fileBtn().textContent).toBe('📁');
    expect(fileBtn().getAttribute('aria-haspopup')).toBe('menu');
    expect(fileBtn().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
  });
  it('opens on the first item; arrows move, Escape closes and returns focus to the button', async () => {
    render(<TopZone />);
    fireEvent.click(fileBtn());
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent?.trim())).toEqual(['💾 Save', '📂 Open…', '🧩 Export process (BPMN)…']);
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(items[2]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0]!, { key: 'End' });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(items[2]!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(fileBtn());
  });
  it('Save downloads the case JSON and closes the menu', () => {
    render(<TopZone />);
    fireEvent.click(fileBtn());
    fireEvent.click(screen.getByRole('menuitem', { name: /Save/ }));
    expect(saved).toHaveLength(1);
    expect(saved[0]!.type).toBe('application/json');
    expect(screen.queryByRole('menu')).toBeNull();
  });
  it('a click outside closes it; the open menu has no axe violation', async () => {
    render(<TopZone />);
    fireEvent.click(fileBtn());
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
