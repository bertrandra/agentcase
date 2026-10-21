#!/usr/bin/env node
// Prints the largest source files so the 150-line pressure is visible (plan §7). Usage: node scripts/sizes.mjs [n]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const rows = ['src', 'tests'].flatMap(d => { try { return walk(d); } catch { return []; } })
  .filter(f => /\.(ts|tsx)$/.test(f)).map(f => [readFileSync(f, 'utf8').split('\n').length, f]).sort((a, b) => b[0] - a[0]);
console.log(rows.slice(0, Number(process.argv[2]) || 10).map(([n, f]) => String(n).padStart(4) + '  ' + f).join('\n'));
console.log(rows.length + ' files, ' + rows.reduce((s, [n]) => s + n, 0) + ' lines');
