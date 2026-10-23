import { PHASES } from '@/domain';
import { skillMapOf } from '@/domain/baseline/skills';
import { activeArtefacts } from '@/domain';
import { allArtefactSkills, SKILL_MAP_DEFAULT, teamSkillList, type Live } from '@/domain/verifyA';
import { resetSkillMap, setSkillMap } from '@/controllers/verifyA';
import { SimpleTable } from '../SimpleTable';

/** The editable map from fine-grained artefact skill labels to the (smaller) set of team skills; amber = edited vs default. */
export function SkillMap({ live }: { live: Live }) {
  const s = live.c.s, map = skillMapOf(s), teams = teamSkillList(s), act = activeArtefacts(live.c.a, s);
  const phaseName = (p: string) => PHASES.find((x) => x.id === p)?.name ?? p;
  return (
    <>
      <p className="ac-muted">Artefacts carry fine-grained skill labels; the team is planned in a smaller set of skills. This editable map aligns the two. Amber = edited vs default.</p>
      <SimpleTable head={['Artefact skill', '', 'Team skill', 'Phase / artefact']}
        rows={allArtefactSkills(live).map((as) => {
          const cur = map[as] || as, edited = map[as] !== SKILL_MAP_DEFAULT[as], arts = act.filter((a) => a.skill === as);
          return { key: as, cells: [<code>{as}</code>, '→',
            <select aria-label={`Team skill of ${as}`} value={cur} style={{ borderColor: edited ? 'var(--ac-amber, var(--ac-warning-600))' : undefined, fontWeight: edited ? 'var(--ac-font-weight-bold)' : undefined }} onChange={(e) => setSkillMap(as, e.target.value)}>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}</select>,
            arts.length ? <div style={{ maxHeight: 120, overflow: 'auto', fontSize: 'var(--ac-font-size-sm)' }}>{arts.map((a) => <div key={a.id}><b>{phaseName(a.phase)}</b> <span>/</span> {a.name}</div>)}</div> : '—'] };
        })} />
      <p><button type="button" onClick={resetSkillMap}>↺ Reset mapping to defaults</button></p>
    </>
  );
}
