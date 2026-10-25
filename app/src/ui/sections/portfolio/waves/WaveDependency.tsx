import { setWaveDependency } from '@/controllers/waveDeps';
import type { BoardColumn, WaveMilestone } from '@/domain/portfolio';
import { toast } from '@/ui/uiState';
import { NumCell } from '@/ui/widgets/CommitField';

const MILESTONES: { id: WaveMilestone; label: string }[] = [
  { id: 'start', label: 'starts' },
  { id: 'setupEnd', label: 'finishes setup (last product)' },
];

/**
 * "Starts after": the wave this one waits for (only waves that would not close a cycle are offered), the milestone and the lag in months.
 * The effective start, when the dependency moves it, is shown below. Every change is one undoable step.
 */
export function WaveDependency({ col }: { col: BoardColumn }) {
  const id = col.id as string, n = col.name, d = col.dependsOn;
  const set = (waveId: string, milestone: WaveMilestone, lag: number, quiet = false) => {
    const ok = setWaveDependency(id, waveId ? { waveId, milestone, lagMonths: Math.max(0, lag) } : null);
    if (!quiet) toast(ok ? `${n}: ${waveId ? 'dependency set' : 'dependency cleared'} — Ctrl+Z to undo` : `${n}: dependency refused`);
  };
  const shown = d && !col.targets.some((t) => t.id === d.waveId) ? [...col.targets, { id: d.waveId, name: d.waveId }] : col.targets;
  return (
    <fieldset className="ac-wave-dep">
      <legend>Dependency</legend>
      <label>Starts after{' '}
        <select aria-label={`Wave that ${n} starts after`} value={d?.waveId ?? ''}
          onChange={(e) => set(e.target.value, d?.milestone ?? 'start', d?.lagMonths ?? 0)}>
          <option value="">No dependency</option>
          {shown.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {d && (
        <>
          <label>when it{' '}
            <select aria-label={`Milestone ${n} waits for`} value={d.milestone} onChange={(e) => set(d.waveId, e.target.value as WaveMilestone, d.lagMonths)}>
              {MILESTONES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label>+ lag (months){' '}
            <NumCell ariaLabel={`Lag in months of ${n} after its dependency`} value={d.lagMonths} min={0} step={1} width={56}
              onCommit={(v) => set(d.waveId, d.milestone, parseInt(v, 10) || 0, true)} />
          </label>
        </>
      )}
      {col.effectiveStart !== col.startMonth && (
        <p className="ac-wave-eff" data-effective-start={col.effectiveStart}>
          Effective start: month {col.effectiveStart} → {col.effectiveLabel} ({col.after})
        </p>
      )}
    </fieldset>
  );
}
