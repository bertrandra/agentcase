import { useSyncExternalStore } from 'react';
import { dismissCalcBanner, getCalcBanner, onCalcBanner } from '@/controllers/calcStaleness';
import type { PackageHeadline } from '@/domain/calcPackage';
import { fmtEurK, fmtMonths } from '../format';

const figures = (h: PackageHeadline): string => `payback ${fmtMonths(h.payback)} / NPV ${fmtEurK(h.npv)}`;

/** Legacy staleness banner: the saved figures no longer match the recomputed ones. The view state is outside the document and the undo history. */
export function CalcStaleBanner() {
  const st = useSyncExternalStore(onCalcBanner, getCalcBanner);
  if (!st) return null;
  const mismatch = st.state === 'versionMismatch';
  return (
    <div className="ac-banner ac-calc-banner" role="status" data-testid="calc-stale-banner">
      <span>
        ⚠️ {mismatch
          ? <><strong>This saved case was computed by a different engine version</strong> ({st.storedVersion ?? '?'} → live {st.liveVersion ?? '?'}). The
            figures shown are recomputed live.</>
          : <><strong>The saved figures no longer match the current inputs</strong> — the numbers shown are recomputed live.</>}
        {st.storedHeadline && <> <span className="ac-calc-saved">Saved: {figures(st.storedHeadline)}</span></>}
        {st.liveHeadline && st.storedHeadline && <> <span className="ac-calc-live">· Live: {figures(st.liveHeadline)}</span></>}
      </span>
      <button type="button" onClick={dismissCalcBanner} aria-label="Dismiss the calculation staleness notice">Dismiss</button>
    </div>
  );
}
