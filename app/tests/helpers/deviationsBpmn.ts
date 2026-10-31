import type { Deviation } from './deviations';

/**
 * The BPMN migration's deviations that move no euro figure (docs/DEVIATIONS.md; the figure-moving ones of B9b are in deviationsB9b.ts). Each is
 * asserted by its own tests; only DEV-REGINCLUDE-DERIVED changes an oracle value (an On/Off variable on one fixture).
 */
export const BPMN_DEVIATIONS: Deviation[] = [
  // BPMN B9a, owner's decision of 2026-10-30 (docs/SPEC_BPMN.md § 7.1 item 3): no oracle field changes; asserted by tests/store/reg-include-derived.test.ts.
  { id: 'DEV-REGINCLUDE-DERIVED',
    reason: 'The "Include regulatory artefacts" box is the process document\'s regInclude only: dom.checked.regInclude is dropped on open and ' +
    'never saved, the ' +
    'command writes the process only, the On/Off variable tgRegInclude and the legacy shape read the process. frame-industry-cross (box ticked, regInclude ' +
    'false) reads Off instead of On; no euro figure changes.', only: ['frame-industry-cross'], skip: [] },
  // BPMN B9a (docs/SPEC_BPMN.md § 19.7): screens only, no oracle field changes; asserted by tests/ui/programme-one-owner.test.ts and the section tests.
  { id: 'DEV-B9A-CONTEXT-SCREENS',
    reason: 'The fields and descriptions of the transformation programme activities (stage weeks, pilot, setup lines and duration, hub, KT ' +
    'preparation, run sizing, coaching load) are edited in the Process section\'s parameter panel only; the context screens keep their figures and ' +
    'link to the activities (Open in Process); the Gantt program bars are read-only.', skip: [] },
  // BPMN B9d (docs/SPEC_BPMN.md § 19.8 F-B78): a screen only, no oracle field changes; asserted by tests/ui/sections/plan.test.tsx.
  { id: 'DEV-B9D-PLAN-SCREEN',
    reason: 'The 📅 Gantt / Timeline section is titled 📅 Plan, with the tabs Gantt (the legacy calendar unchanged, then the programme Gantt), WBS, ' +
    'OBS / RAM and Histogram and the plan exports; the menu label stays the legacy one (Sections sheet, Board dashboards). No figure changes.', skip: [] },
];
