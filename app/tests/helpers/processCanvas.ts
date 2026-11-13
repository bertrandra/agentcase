import { cleanup } from '@testing-library/react';
export { act, fireEvent, render } from '@testing-library/react';
export { readProcess } from '@/domain/process';
export { appStore };
export { default as Process } from '@/ui/sections/scope/process';
import { afterEach, beforeEach } from 'vitest';
import { appStore } from '@/store/instance';
import { resetProcessView } from '@/ui/sections/scope/process/view';
import { freshStore } from '../store/helpers';

/** Shared by the 🧩 Process canvas UI tests (process-canvas-edit, process-canvas-select): the case's process, a button by its text, an ⋯. */
export const doc = () => appStore().getState().doc.BPMN as never;
export const button = (text: string): HTMLButtonElement => [...document.querySelectorAll('button')].find((b) => b.textContent!.trim() === text)!;
export const more = (id: string) => [...document.querySelectorAll('.ac-proc-canvas .ac-bpmn-more')]
  .find((g) => g.querySelector('title')!.textContent!.startsWith(`Actions on ${id}:`))!;
/** A fresh store and process view before each test, the rendered tree cleaned after. */
export function canvasTestSetup(): void {
  beforeEach(() => { freshStore(); resetProcessView(); });
  afterEach(cleanup);
}
