import { maturityRows, type Live } from '@/domain/verifyA';
import { Badge, Callout, Panel } from '@/ui/widgets/cards';
import { SimpleTable } from '../SimpleTable';

/** Maturity mapping L1-L4: the case's level is the lower of the adoption reading and the vFTE-share reading, capped by the engagement context. */
export function Maturity({ live }: { live: Live }) {
  const { rows, info, context } = maturityRows(live);
  return (
    <Panel title="Maturity mapping L1–L4" aside={<Badge tone="blue">EV-02 · v12.57</Badge>}>
      <p className="ac-muted">
        Shared language with the delivery-model referential: the L-level is the <b>lower</b> of the ramp reading and the vFTE-share reading (prudent), capped by the engagement
        context (L{info.cap} max under {context}). Current: ramp Y3 = {Math.round(info.rampY3)}% → L{info.lr} · vFTE share Y3 = {Math.round(info.share)}% → L{info.ls}.
      </p>
      <SimpleTable align={['left', 'center', 'center', 'center', 'center']} head={['Level', 'Adoption ramp', 'vFTE share', 'Dominant AI authorization', 'Typical human supervision']}
        rows={rows.map((r) => ({
          key: r.label, style: { background: r.current ? 'var(--ac-amber-bg, #FFF5E8)' : undefined, fontWeight: r.current ? 700 : undefined, color: r.blocked ? 'var(--ac-muted)' : undefined },
          cells: [<>{r.label}{r.blocked && <> <small>blocked by context</small></>}{r.current && ` ◀ your case (Y${live.m.horizon})`}</>, r.ramp, r.share, r.auth, r.sup],
        }))} />
      {info.diverge && <Callout kind="warn">⚠ CC-L4-01 — maturity signals diverge by more than one level (ramp vs vFTE share): review the ramp or the automation depth.</Callout>}
    </Panel>
  );
}
