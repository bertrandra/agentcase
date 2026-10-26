/** The 16 sections of the "verify" group: id and the title of their h1. */
export const VERIFY_IDS: [string, RegExp][] = [
  ['fte-vfte', /FTE \/ vFTE Chart/], ['vfte-ov', /vFTE Overview/], ['team-out', /Target team/], ['tobe-team', /TO-BE team composition/],
  ['phase-art', /Phase \/ Artifact details/],
  ['agent-dir', /Agent Directory/], ['agent-detail', /Agent details/], ['agent-usage', /Agent usage/], ['exec', /Execution Timeline/],
  ['productivity', /Productivity/],
  ['velocity', /Velocity/], ['quality', /^Quality$/], ['compliance', /Regulatory compliance/], ['gantt', /Gantt/], ['kpi', /KPI Scorecard/],
  ['asis-tobe', /AS-IS vs TO-BE/],
];
