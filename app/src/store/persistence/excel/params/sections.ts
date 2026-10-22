/** @calc-zone exports */
import type { ParamsDoc, ParamsEnv, SectionGroupEntry, SectionInfo } from './types';

/**
 * The section catalogue as the case sees it: the built-in sections, the case's dynamic sections (legacy mirrors them into the catalogue)
 * and the case's own group / order / tag / MVP overrides (`sectionGroups`) laid over them.
 */
export function effectiveSections(env: ParamsEnv, d: ParamsDoc): SectionInfo[] {
  const list: SectionInfo[] = env.sections.map((s) => ({ ...s }));
  (d.dynamicSections ?? []).forEach((dy) => {
    if (!list.some((s) => s.id === dy.id)) list.push({ id: dy.id, label: `🗂️ ${dy.title}`, group: dy.menuGroup, groupSeq: dy.order != null ? dy.order : list.length, description: `Dynamic section (${dy.archetype})` });
  });
  const by = new Map(list.map((s) => [s.id, s]));
  (d.sectionGroups ?? []).forEach((e) => {
    const s = by.get(e.id); if (!s) return;
    if (e.group != null) s.group = e.group;
    if (e.groupSeq != null) s.groupSeq = e.groupSeq;
    if ('tag' in e) { if (e.tag) s.tag = e.tag; else delete s.tag; }
    if ('mvp' in e) { if (e.mvp) s.mvp = true; else delete s.mvp; }
  });
  return list;
}
/** Back to the stored form (legacy `sectionGroups` state entry). */
export const toSectionGroups = (secs: SectionInfo[]): SectionGroupEntry[] => secs.map((s) => ({ id: s.id, group: s.group, groupSeq: s.groupSeq, tag: s.tag, mvp: s.mvp }));
