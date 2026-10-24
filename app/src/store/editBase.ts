/** @calc-zone product-resolution */
import { appStore } from './instance';
import { editBaseOf } from './portfolioState';
import type { Doc } from './types';

/**
 * The ONLY way a controller reads the case (ESLint forbids `getState().doc` in `src/controllers`, docs/ARCHITECTURE.md § 4 "Edit base").
 *
 * `editBase()`: the case the next case command will run on — the COMMON case with "Change: All products" in a Portfolio / Wave view, else the
 * active product's effective case. Use it to validate a command, label it or compare before / after. A value written by a command is computed
 * inside its `run(draft)` (the draft IS that case) whenever possible, never from another product's case.
 */
export const editBase = (): Doc => editBaseOf(appStore().getState().portfolio);

/**
 * `activeDoc()`: the ACTIVE product's effective case, read-only. For what is explicitly about the active product (exports, file names, the
 * Monte Carlo runs of the results, a snapshot capture of "the current case") — never to build the payload of a case command.
 */
export const activeDoc = (): Doc => appStore().getState().doc;
