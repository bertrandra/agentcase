import { resetMcRanges, runSimulation, setMcAuto } from '@/controllers/stress';
import { setInput } from '@/controllers/inputs';
import { useDoc } from '@/store/hooks';
import { Field } from '@/ui/widgets/fields';

function Num({ id, label, dflt, min, max, step }: { id: string; label: string; dflt: number; min: number; max?: number; step: number }) {
  const v = useDoc((d) => d.dom.values[id] || String(dflt));
  return <Field label={label}><input type="number" value={v} min={min} max={max} step={step} onChange={(e) => setInput(id, e.target.value)} style={{ width: 90 }} /></Field>;
}

/** Draws, seed, run button, auto re-run switch and the reset of the uncertainty ranges. */
export function Controls() {
  const auto = useDoc((d) => (d as { mcAuto?: boolean }).mcAuto !== false);
  return (
    <div className="ac-form-row">
      <Num id="mcDraws" label="Draws" dflt={1000} min={100} max={5000} step={100} />
      <Num id="mcSeed" label="Seed" dflt={42} min={1} step={1} />
      <button type="button" onClick={() => runSimulation()}>▶ Run simulation</button>
      <label className="ac-check"><input type="checkbox" checked={auto} onChange={(e) => setMcAuto(e.target.checked)} /> Auto re-run on scenario change</label>
      <button type="button" onClick={resetMcRanges}>↺ Reset ranges</button>
    </div>
  );
}
