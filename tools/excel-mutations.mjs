// Hand-damaged variants of the default-case parameters workbook, used by tools/excel-compat.mjs: both the legacy importParams() and our reader must
// make exactly the same of each. Row/column numbers follow the legacy layout (1 = header row); see docs of each sheet in the workbook itself.
const cell = (wb, sheet, r, c, v) => { wb.getWorksheet(sheet).getRow(r).getCell(c).value = v; };
const add = (wb, sheet, ...rows) => rows.forEach((r) => wb.getWorksheet(sheet).addRow(r));
const eachData = (wb, sheet, fn) => wb.getWorksheet(sheet).eachRow((row, i) => { if (i > 1) fn(row, i); });

export const MUTATIONS = {
  'phase scope: nothing included': (wb) => eachData(wb, 'Phase Scope', (r) => { r.getCell(3).value = 'No'; }),
  'phase scope vs SDLC selection': (wb) => { cell(wb, 'Phase Scope', 3, 3, 'No'); cell(wb, 'Phase Scope', 2, 3, 'Yes'); },
  'phase scope only (no SDLC rows selected)': (wb) => { eachData(wb, 'Phase Scope', (r, i) => { r.getCell(3).value = i <= 4 ? 'Yes' : 'No'; }); eachData(wb, 'SDLC Artifacts', (r) => { r.getCell(5).value = 'No'; }); },
  'team: bad rows, pins, rounding': (wb) => {
    cell(wb, 'Input Team', 2, 3, 'Atlantis'); cell(wb, 'Input Team', 3, 4, -2); cell(wb, 'Input Team', 4, 5, 'A017;A017;ZZZ;R001');
    add(wb, 'Input Team', ['Dev', 'B2', 'India', 2.3, 'A017;A018'], ['', 'B2', 'India', 4, ''], ['Ops/Run', 'C1', 'Poland', 'abc', '']);
  },
  'team: everything unusable': (wb) => eachData(wb, 'Input Team', (r) => { r.getCell(4).value = 'x'; }),
  'parameters: out of range': (wb) => eachData(wb, 'Parameters', (r, i) => { if (i <= 16) r.getCell(2).value = i % 2 ? -50 : 99999999; }),
  'parameters: horizon, industry, customer': (wb) => { cell(wb, 'Parameters', 7, 2, 4); cell(wb, 'Parameters', 17, 2, 'XYZ'); cell(wb, 'Parameters', 18, 2, '  Spacey Co  '); },
  'parameters: text values': (wb) => { cell(wb, 'Parameters', 2, 2, '60abc'); cell(wb, 'Parameters', 3, 2, 'abc'); cell(wb, 'Parameters', 8, 2, '12000.5'); cell(wb, 'Parameters', 7, 2, 7); cell(wb, 'Parameters', 17, 2, 'MED'); },
  'rate card: bad values and column': (wb) => { cell(wb, 'Rate Card', 2, 2, -5); cell(wb, 'Rate Card', 3, 2, 'abc'); cell(wb, 'Rate Card', 1, 9, 'Atlantis'); cell(wb, 'Rate Card', 2, 9, 123); cell(wb, 'Rate Card', 4, 3, 555.5); cell(wb, 'Rate Card', 6, 1, 'Z'); },
  'location target: clamp and sum': (wb) => { cell(wb, 'Location Target', 2, 3, 150); cell(wb, 'Location Target', 8, 3, 20); cell(wb, 'Location Target', 3, 3, 'abc'); },
  'token models: bad values, share': (wb) => { cell(wb, 'Token Models', 2, 2, 150); cell(wb, 'Token Models', 2, 3, -3); cell(wb, 'Token Models', 3, 1, ''); cell(wb, 'Token Models', 4, 4, 'abc'); eachData(wb, 'Token Models', (r) => { if (String(r.getCell(1).value).startsWith('Output')) r.getCell(2).value = 250; }); },
  'regulatory: norms, settings': (wb) => { eachData(wb, 'Reg Norms', (r, i) => { r.getCell(4).value = i < 5 ? 'Yes' : 'No'; }); cell(wb, 'Reg Settings', 2, 2, 'Yes'); cell(wb, 'Reg Settings', 3, 2, 'No'); cell(wb, 'Reg Settings', 4, 2, 'Yes'); cell(wb, 'Parameters', 17, 2, 'AERO'); },
  'regulatory artefacts: select, values': (wb) => {
    eachData(wb, 'Reg Norms', (r, i) => { r.getCell(4).value = i < 4 ? 'Yes' : 'No'; });
    eachData(wb, 'Reg Artifacts', (r, i) => { if (i < 12) { r.getCell(7).value = i % 3 ? 'Yes' : 'No'; r.getCell(8).value = [120, -5, 33.6, 'abc'][i % 4]; r.getCell(9).value = [-2, 0, 7.5, 'x'][i % 4]; r.getCell(10).value = [7, 'q', 2, 3][i % 4]; } });
    // (an unknown id such as R9999 set to Yes is not tried here: the legacy import adds it to the selection, ours ignores it — see the report)
  },
  'sdlc artefacts: values': (wb) => { cell(wb, 'SDLC Artifacts', 2, 6, 33.6); cell(wb, 'SDLC Artifacts', 2, 7, -4); cell(wb, 'SDLC Artifacts', 3, 7, 0); cell(wb, 'SDLC Artifacts', 4, 8, 'abc'); cell(wb, 'SDLC Artifacts', 5, 6, 140); cell(wb, 'SDLC Artifacts', 5, 5, 'Yes'); add(wb, 'SDLC Artifacts', ['A999', 'V1', 'ghost', '', 'Yes', 10, 3, 1]); },
  'agent catalog and loop pairs edited': (wb) => { cell(wb, 'Agent Catalog', 2, 4, 40); cell(wb, 'Agent Catalog', 3, 4, -1); cell(wb, 'Loop Pairs', 2, 6, 25); cell(wb, 'Loop Pairs', 3, 6, 50); },
  'personas: duplicates, bad ids, defaults': (wb) => {
    add(wb, 'Personas', ['builder', 'Builder again', 'No', 7, 'Yes', 'Yes'], ['bad id!', 'Weird', 'No', 'abc', '', 'x'], ['advanced', 'Hack', 'No', 1, 'No', 'No'], ['', 'blank', 'No', 3, 'No', 'No'], ['new-p', '', 'Yes', 11, 'y', 'yes']);
    cell(wb, 'Personas', 3, 6, 'Yes');
  },
  'persona sections: unknown ids': (wb) => add(wb, 'Persona Sections', ['ghost', 'home'], ['builder', 'no-such-section'], ['', 'home'], ['builder', '']),
  'persona order: odd values': (wb) => add(wb, 'Persona Section Order', ['builder', 'home', 'abc'], ['builder', 'nope', 3], ['builder', 'io', 2.5], ['ghost', 'home', 1]),
  'persona sequence: odd rows': (wb) => add(wb, 'Persona Sequence', ['ghost', 'Yes', 1, 'x', 'home'], ['builder', 'Yes', 0, 'zero', 'home'], ['builder', 'No', 'abc', 'bad', 'home'], ['builder', 'Yes', 20, 'Late', 'home'], ['builder', 'Yes', 20, 'Late', 'nope'], ['builder', 'Yes', 15, '', '']),
  'groups and sections': (wb) => {
    add(wb, 'Groups', ['Weird Group!', 'Weird', 'abc', 'desc', 'red'], ['okgrp', 'OK group', 5, 'd', '#ABC']);
    cell(wb, 'Groups', 2, 2, 'Renamed frame'); cell(wb, 'Groups', 2, 5, '#FF0000');
    add(wb, 'Sections', ['no-such-section', 'x', 'frame', 1, '', '', ''], ['home', 'Home', 'newgroup', 'abc', 'Drives<>', 'x', ''], ['params', 'P', 'okgrp', 9, 'reads', '', '']);
  },
  'dependencies: odd rows': (wb) => add(wb, 'Dependencies', ['ghost', 'params', 'strong', 'n'], ['params', 'ghost', 'soft', ''], ['home', '', '', 'only a note'], ['home', 'params', 'I', ''], ['home', 'scurve', 'whatever', '']),
  's-curve: two points': (wb) => { const ws = wb.getWorksheet('S-Curve'); ws.addRow(['Point', 6, 20]); ws.addRow(['Point', 24, 80]); },
  's-curve: bogus family, odd points': (wb) => { cell(wb, 'S-Curve', 2, 2, 'bogus'); add(wb, 'S-Curve', ['Point', 0, 5], ['Point', 6, 20], ['Point', 24, 80], ['Point', 36, 140], ['Point', 200, 50], ['Point', 12, 'abc']); },
  's-curve: logistic with points': (wb) => { cell(wb, 'S-Curve', 2, 2, 'logistic'); add(wb, 'S-Curve', ['Point', 6, 10], ['Point', 18, 55], ['Point', 30, 90], ['Point', 36, 98]); },
  'lifecycle: edits': (wb) => { cell(wb, 'Status Lifecycle', 2, 2, 'No'); cell(wb, 'Status Lifecycle', 3, 2, 150); cell(wb, 'Status Lifecycle', 7, 3, 1.9); cell(wb, 'Status Lifecycle', 8, 4, 'abc'); cell(wb, 'Status Lifecycle', 9, 2, 0); },
  'lifecycle: position': (wb) => cell(wb, 'Status Lifecycle', 3, 2, 62),
  'strategies: odd numbers and modes': (wb) => { cell(wb, 'Strategies', 2, 9, 9); cell(wb, 'Strategies', 2, 10, 0); cell(wb, 'Strategies', 2, 11, 'custom'); cell(wb, 'Strategies', 3, 11, 'weird'); cell(wb, 'Strategies', 3, 2, 'abc'); cell(wb, 'Strategies', 3, 7, ''); cell(wb, 'Strategies', 4, 12, 'abc'); cell(wb, 'Strategies', 5, 11, 'inherit'); },
  'skill map and TO-BE split': (wb) => { add(wb, 'Skill Map', ['Brand New', 'Dev'], ['', 'Dev'], ['X', '']); cell(wb, 'TO-BE Location Split', 2, 2, 'abc'); cell(wb, 'TO-BE Location Split', 2, 3, 60); add(wb, 'TO-BE Location Split', ['Ghost skill', 50, 50, 0, 0, 0, 0, 0]); },
  'factory sheets: dangling keys': (wb) => {
    add(wb, 'FM Portfolio', ['p1', 'Portfolio 1'], ['p2', '']);
    add(wb, 'FM Epic', ['e1', 'Epic 1', 'p1'], ['e2', 'Epic 2', 'ghost']);
    add(wb, 'FM Feature', ['f1', 'Feature 1', 'e1', 'V1;V3;ZZ'], ['f2', '', 'ghost', '']);
    add(wb, 'FM Story', ['s1', 'Story 1', 'f1'], ['s2', 'Story 2', 'ghost']);
    add(wb, 'FM Release', ['r1', 'Release 1']);
    add(wb, 'FM Release Items', ['ri1', 'r1', 'Feature', 'f1', 'lbl'], ['ri2', 'ghost', 'Fix', '', ''], ['', 'r1', '', '', '']);
    add(wb, 'FM Release Candidates', ['rc1', 'RC 1', 'r1', '2026-01-01', 'Cut'], ['rc2', '', 'ghost', '', '']);
    add(wb, 'FM Approvals', ['ap1', 'rc1', 'Boss', '', '2026-01-02', ''], ['ap2', 'ghost', '', 'Approved', '', '']);
    add(wb, 'FM Deployments', ['d1', 'rc1', 'env-dev', '2026-01-03', ''], ['d2', 'ghost', 'ghost', '', 'Failed']);
    add(wb, 'FM Commits', ['c1', 'sdlc:A001', 'msg', 'me', '2026-01-01'], ['c2', 'foo', '', '', ''], ['c3', 'reg:R001', 'm', 'x', '']);
    add(wb, 'FM Builds', ['b1', '', '', '']); add(wb, 'FM Build Artifacts', ['ba1', '', 'b1', '', ''], ['ba2', 'n', 'ghost', 'Docker', '2.0']);
    add(wb, 'FM Quality Gates', ['q1', '', 'ba1', ''], ['q2', '', 'ghost', 'Pass']); add(wb, 'FM Monitoring', ['m1', 'd1', '', '', ''], ['m2', 'ghost', 'ts', 'desc', 'High']);
    add(wb, 'FM Feedback', ['fb1', 'feedback', '2026-01-01', 'bl1']); add(wb, 'FM Backlog', ['bl1', 'backlog', '', 'fb1']);
    cell(wb, 'FM Singletons', 2, 2, 'My vision\nsecond line'); cell(wb, 'FM Singletons', 3, 2, ''); cell(wb, 'FM Singletons', 4, 2, 'ba1; ba2 ;');
  },
  'factory environments': (wb) => { cell(wb, 'FM Environments', 2, 2, 'Dev renamed'); cell(wb, 'FM Environments', 3, 3, 'abc'); add(wb, 'FM Environments', ['env-x', '', 9]); },
  'dynamic sections: unknown ids': (wb) => {
    add(wb, 'Dynamic Sections', ['ghost', 'T', 'x', 'frame', 1, 'No', 'd']); add(wb, 'Dynamic Section Cards', ['ghost', 'c1', 'Yes', 'n', '', '', '', '', '', '', '', '', '', '', '', 1]);
    add(wb, 'Dynamic Section Rows', ['ghost', 'r1', 1, 'l', '', '', '', '']);
  },
  'only the Parameters sheet': (wb) => { [...wb.worksheets].filter((w) => w.name !== 'Parameters').forEach((w) => wb.removeWorksheet(w.id)); cell(wb, 'Parameters', 3, 2, 12); },
  'an old workbook (no persona, curve, dynamic, factory sheets)': (wb) => { ['Personas', 'Persona Sections', 'Groups', 'Sections', 'Dependencies', 'S-Curve', 'Persona Section Order', 'Persona Sequence', 'Dynamic Sections', 'Dynamic Section Cards', 'Dynamic Section Rows', 'Agent Catalog', 'Loop Pairs']
    .forEach((n) => { const w = wb.getWorksheet(n); if (w) wb.removeWorksheet(w.id); }); [...wb.worksheets].filter((w) => /^FM /.test(w.name)).forEach((w) => wb.removeWorksheet(w.id)); cell(wb, 'Parameters', 2, 2, 55); },
  // the legacy test import_proto_and_zero_rate (L-13) and a customer template: hand-made partial sheets, short rows
  'template-style workbook with __proto__': (wb) => {
    [...wb.worksheets].forEach((w) => wb.removeWorksheet(w.id));
    const w1 = wb.addWorksheet('Rate Card'); w1.addRow(['Band', '__proto__', 'France']); w1.addRow(['A', 111, 0]);
    const w2 = wb.addWorksheet('Input Team'); w2.addRow(['Skill', 'Grade', 'Location', 'FTE']); w2.addRow(['Dev', 'B2', '__proto__', 2]); w2.addRow(['Dev', 'B2', 'France', 5]);
    const w3 = wb.addWorksheet('Location Target'); w3.addRow(['Location', 'AS-IS', 'Target %']); w3.addRow(['__proto__', 0, 50]); w3.addRow(['France', 0, 60]);
    const w4 = wb.addWorksheet('Parameters'); w4.addRow(['Parameter', 'Value']); w4.addRow(['Automation potential (%)', 60]); w4.addRow(['Customer', 'Template Co']);
  },
};
