#!/usr/bin/env node
// Regenerates src/store/defaults/defaultDoc.json (the default case) from the legacy oracle's golden fixture.
import { readFileSync, writeFileSync } from 'node:fs';
const s = JSON.parse(readFileSync('fixtures/cases/golden.json', 'utf8'));
delete s.savedAt;
writeFileSync('src/store/defaults/defaultDoc.json', JSON.stringify(s));
