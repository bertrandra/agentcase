import { engineNow, model } from '@/domain';
import type { Ctx } from '@/domain';
import type { Live } from '@/domain/verifyA';
import { useCtx } from '@/store/hooks';

const memo = new WeakMap<Ctx, Live>();

/** The live case for the verify views: context, model() and the Time Engine (both cached per context in the domain). */
export function useLive(): Live {
  const c = useCtx();
  let l = memo.get(c);
  if (!l) { l = { c, m: model(c), eng: engineNow(c) }; memo.set(c, l); }
  return l;
}
