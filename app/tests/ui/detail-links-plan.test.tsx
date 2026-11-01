// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '@/store/instance';
import { uiStore } from '@/ui/uiState';
import { DetailLinks } from '@/ui/widgets/DetailLinks';
import { linkLabel } from '@/ui/zones/registry';
import { freshStore } from '../store/helpers';

/**
 * SPEC_FIXES FX-18 / FX-19: a wave's detail link opens 📅 Plan on that wave (the display scope becomes the wave, so the plan shows its own bars),
 * and a link names the screen it opens (📅 Plan), not the legacy menu label (📅 Gantt / Timeline, kept in the menu, DEV-B9D-PLAN-SCREEN).
 */
beforeEach(() => freshStore());
afterEach(cleanup);

describe('detail links to 📅 Plan', () => {
  it('names the screen by its title', () => {
    expect(linkLabel('gantt')).toBe('📅 Plan');
    expect(linkLabel('scope-sel')).not.toBe('scope-sel');
  });
  it('a wave opens Plan on that wave', () => {
    const w = appStore().getState().portfolio.waves[0]!;
    render(<DetailLinks id={`prog-wave-${w.id}`} name={w.name} detail={{ kind: 'wave', sections: ['gantt'] }} />);
    fireEvent.click(screen.getByRole('button', { name: `Open ${w.name} in 📅 Plan` }));
    expect(uiStore.getState().activeSection).toBe('gantt');
    expect(appStore().getState().portfolio.displayScope).toEqual({ kind: 'wave', id: w.id });
  });
});
