/** @calc-zone workspace-config */
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';

// Persona is a view preference: applied and persisted with the case, but never put on the undo stack (decision D4).
const setPersonaCmd = defineCommand<{ persona: string }>({
  type: 'view.setPersona', label: (p) => `Switch to the ${p.persona} persona`, undoable: false, run(d, p) { d.currentPersona = p.persona; },
});
const setCustomerCmd = defineCommand<{ name: string }>({
  type: 'case.setCustomerName', label: (p) => `Set customer to ${p.name || '(none)'}`, coalesceKey: () => 'case.setCustomerName',
  run(d, p) { d.customerName = p.name; },
});

export const setPersona = (persona: string): void => appStore().dispatch(setPersonaCmd({ persona }));
export const setCustomerName = (name: string): void => appStore().dispatch(setCustomerCmd({ name }));
