import type { Patch } from 'immer';
import type { Product } from '@/domain/portfolio';
import type { Doc, EditScope, PortfolioDoc } from '../types';

/** Everything the address layer knows while it maps ONE command's changes onto the portfolio. */
export interface AddressCtx {
  pf: PortfolioDoc;
  /** the effective case the command started from, and the one it produced */
  base: Doc;
  next: Doc;
  /** index and current state of the active product */
  ai: number;
  prod: Product;
  scope: EditScope;
  out: Patch[];
  /** containers this command has already created (so two writes do not both add them) */
  made: Set<string>;
}

export type Path = (string | number)[];
export const add = (c: AddressCtx, path: Path, value: unknown): void => { c.out.push({ op: 'add', path, value }); };
export const remove = (c: AddressCtx, path: Path): void => { c.out.push({ op: 'remove', path }); };
export const productPath = (c: AddressCtx, ...rest: Path): Path => ['products', c.ai, ...rest];
