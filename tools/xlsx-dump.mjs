// Helpers shared by tools/excel-results-oracle.mjs: a normalised dump of a workbook, and the hand edits applied to a DD pack.
// (app/tests/helpers/xlsxDump.ts mirrors dumpCell/applyEdits for the TypeScript side — keep the two in step.)

/** One cell as plain JSON: number | string | boolean | null | {f, r} (formula) | ISO date string. Rich text and hyperlinks flatten to text. */
export function dumpCell(v) {
  if (v == null) return null;
  if (v instanceof Date) return 'date:' + v.toISOString();
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map(r => r.text || '').join('');
    if (v.formula != null || v.sharedFormula != null) return { f: v.formula ?? v.sharedFormula, r: dumpCell(v.result) };
    if (v.text != null) return String(v.text);
    if (v.error) return 'error:' + v.error;
    return null;
  }
  return v;
}

/** [{name, rowCount, columnCount, rows: [[cell...]...]}] — every row, trailing empty cells trimmed. Images are not dumped. */
export async function dumpWorkbook(wb) {
  return wb.worksheets.map(ws => {
    const rows = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const vals = []; const row = ws.getRow(r);
      for (let c = 1; c <= ws.columnCount; c++) vals.push(dumpCell(row.getCell(c).value));
      while (vals.length && vals[vals.length - 1] === null) vals.pop();
      rows.push(vals);
    }
    return { name: ws.name, rowCount: ws.rowCount, columnCount: ws.columnCount, rows };
  });
}

/** Hand edits of a DD pack (state col K, owner L, due M, note N), by row id. A value is text, {date}, {rich} or {formula,result}. */
export function DD_EDITS(ids) {
  const long = 'L'.repeat(300);
  return {
    rows: [
      { id: ids[0], st: 'confirmed', owner: 'Alice', due: '2026-12-31', note: 'ok' },
      { id: ids[1], st: ' DISPUTED ', note: 'a\tb\nc  d' },
      { id: ids[2], st: 'bogus', owner: 'Bob' },
      { id: ids[3], st: 'bogus' },
      { id: ids[4], st: 'waived', due: { date: '2027-03-04T00:00:00.000Z' } },
      { id: ids[5], owner: { rich: 'Rich Owner' }, st: 'requested' },
      { id: ids[6], owner: long, note: long + long, st: 'confirmed' },
      { id: ids[7], st: { formula: '"con"&"firmed"', result: 'confirmed' } },
      { id: ids[8], st: 99, owner: 12 },
    ],
    append: [{ id: 'zz-unknown', st: 'confirmed' }, { id: '__proto__', st: 'confirmed' }, { id: 'cf-perfrel-cap<b>', st: 'confirmed' }, { id: '', st: 'confirmed' }, { id: 'constructor', note: 'x' }],
  };
}

const asCell = v => (v && typeof v === 'object' ? (v.date ? new Date(v.date) : v.rich ? { richText: [{ text: v.rich.slice(0, 4) }, { text: v.rich.slice(4) }] } : { formula: v.formula, result: v.result }) : v);

export async function editDdWorkbook(wb, edits) {
  const ws = wb.getWorksheet('DD_Register'), at = {};
  ws.eachRow((row, i) => { if (i > 1) at[String(row.getCell(1).value)] = row; });
  const put = (row, e) => { for (const [col, k] of [[11, 'st'], [12, 'owner'], [13, 'due'], [14, 'note']]) if (e[k] !== undefined) row.getCell(col).value = asCell(e[k]); };
  for (const e of edits.rows) if (at[e.id]) put(at[e.id], e);
  for (const e of edits.append) { const row = ws.addRow([e.id]); put(row, e); }
}
