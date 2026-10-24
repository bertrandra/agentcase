/** @calc-zone workspace-config */
import { defineCommand, definePortfolioCommand } from '@/store/commands';
import { appStore } from '@/store/instance';

// The persona is view state of the tab (decision D3): applied, never on the undo stack (D4), never broadcast to another tab (`VIEW_FIELDS`); a file only
// records it as the persona it opens on (`store/persona.ts`).
const setPersonaCmd = definePortfolioCommand<{ persona: string }>({
  type: 'view.setPersona', label: (p) => `Switch to the ${p.persona} persona`, undoable: false,
  apply: (pf, p) => (pf.persona === p.persona ? pf : { ...pf, persona: p.persona }),
});
const setCustomerCmd = defineCommand<{ name: string }>({
  type: 'case.setCustomerName', label: (p) => `Set customer to ${p.name || '(none)'}`, coalesceKey: () => 'case.setCustomerName',
  run(d, p) { d.customerName = p.name; },
});

export const setPersona = (persona: string): void => appStore().dispatch(setPersonaCmd({ persona }));
/** This tab's persona (before a first choice: the default one). */
export const currentPersona = (): string | undefined => appStore().getState().portfolio.persona;
export const setCustomerName = (name: string): void => appStore().dispatch(setCustomerCmd({ name }));
