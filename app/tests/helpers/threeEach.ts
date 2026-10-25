import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { threeProducts, type Three } from './portfolioStore';

/** A fresh three-product store (`threeProducts`) before each test of the file and a DOM cleanup after it; returns the current store's handles. */
export function eachThree(): () => Three {
  let t: Three | null = null;
  beforeEach(() => { t = threeProducts(); });
  afterEach(cleanup);
  return () => t as Three;
}
