import { useMemo, useSyncExternalStore } from 'react';
import { mcsRunStore } from '@/controllers/modelRun';
import type { DepEdges } from '@/domain/refshare/deps';
import { calcChain } from '@/domain/pdc/verifChain';
import { verifChecks } from '@/domain/pdc/verifChecks';
import { convergenceChecks } from '@/domain/pdc/verifConvergence';
import { provenance } from '@/domain/pdc/verifProvenance';
import { directionalSensitivity } from '@/domain/pdc/verifSensi';
import { useCtx, useDoc } from '@/store/hooks';
import { useEvalDate } from '@/ui/evalDate';
import { Callout } from '@/ui/widgets/cards';
import { SECTIONS } from '@/ui/zones/registry';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Convergence } from './Convergence';
import { Provenance } from './Provenance';
import { Chain, Checks, Conventions, Sensi } from './Tables';

const help = (
  <>
    <p>Runs automatic consistency checks on the current configuration and exposes the full calculation chain — the model auditing itself in real time.
      The checks prove the maths is internally coherent (no double counting, effort conserved, benefits = baseline − run + KT avoided − verification
      tax − external rework). They do not say the automation potential is realistic.</p>
    <p>If a check fails, the case is structurally wrong — do not present it. A green board is necessary, not sufficient: due diligence is the other half.</p>
  </>
);

/** Detailed logic verification — provenance, convergence checks, consistency checks, calculation chain and directional sensitivity. */
export default function VerifSection() {
  const c = useCtx(), now = useEvalDate(), mcsLast = useSyncExternalStore(mcsRunStore.subscribe, () => mcsRunStore.getState().last),
    deps = useDoc((d) => d.SECTION_DEPS as DepEdges | undefined);
  // session state some audits read (legacy MCS_LAST, SECTION_CATALOG / SECTION_DEPS); the Monthly Playback keeps its play state in its own section,
  // so it is idle here
  const v = useMemo(() => ({ prov: provenance(c), conv: convergenceChecks(c, { mcsLast, deps, sections: SECTIONS, now }), checks: verifChecks(c),
    chain: calcChain(c), sensi: directionalSensitivity(c) }), [c, mcsLast, deps, now]);
  return (
    <SectionFrame title="🔍 Detailed logic verification" help={help}
      result={<>
        <Provenance p={v.prov} /><Convergence checks={v.conv} />
        <Callout>This tab exposes the <strong>full calculation chain</strong> and runs <strong>automatic consistency checks</strong> on the current
          configuration. Goal: traceability and auditability of the model (V7 fixes).</Callout>
        <Checks checks={v.checks} /><Chain rows={v.chain} /><Conventions /><Sensi rows={v.sensi} />
      </>} />
  );
}
