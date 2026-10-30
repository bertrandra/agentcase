/** @calc-zone process-model */
import type { BpsimValues } from '../bpsim';
import { readProcess } from '../read';
import type { XDocument } from '../xml';

/**
 * BPSim for the rework paths drawn as error boundary events (spec F-B47, D-B5, D-B20; phase B5b). On export, the probability of each boundary
 * rework (`ac:rework probability`) is also written as the BPSim `ControlParameters/Probability` of the sequence flow leaving the event (BPSim
 * puts branching probabilities on flows). The import side is `bpsimRework.ts`.
 */
export function boundaryBpsim(d: XDocument): [string, BpsimValues][] {
  const v = readProcess(d), out: [string, BpsimValues][] = [];
  for (const r of v.reworks) {
    const f = v.flows.find((x) => x.source === r.id);
    if (f && !f.rework) out.push([f.id, { probability: r.probability }]);
  }
  return out;
}
