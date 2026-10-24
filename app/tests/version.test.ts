import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, versionFileTag, versionTag } from '@/domain/version';
import { appVerFileTag, appVerTag } from '@/domain/snapshots';

/** Every file under `dir` (recursively), as paths relative to the app folder. */
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

describe('the version has one source: package.json', () => {
  it('APP_VERSION is package.json "version", injected by vite.config.ts', () => {
    expect(APP_VERSION).toBe(JSON.parse(readFileSync('package.json', 'utf8')).version);
    expect(readFileSync('src/domain/version.ts', 'utf8')).toContain('= __APP_VERSION__');
  });
  it('is a release version (no pre-release suffix)', () => expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/));
  it('index.html carries the title placeholder, filled from the version at build time', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<title>AgentCase %APP_VER_TAG% —');
    expect(readFileSync('vite.config.ts', 'utf8')).toContain('__APP_VERSION__: JSON.stringify(version)');
  });
  it('bumping the version touches only package.json: no other file under src, tests or index.html holds the literal version or its tags', () => {
    const literals = [APP_VERSION, appVerTag(), appVerFileTag()];
    const hits = ['src', 'tests'].flatMap(walk).concat('index.html').filter((f) => /\.(ts|tsx|json|html|css|mjs)$/.test(f))
      .filter((f) => { const t = readFileSync(f, 'utf8'); return literals.some((l) => new RegExp(`${l.replace(/\./g, '\\.')}(?![\\d_.])`).test(t)); });
    expect(hits).toEqual([]);
  });
});

describe('version tags (legacy appVerTag / appVerFileTag)', () => {
  it('pins the format on fixed versions: x.y.0 drops the ".0", a patch keeps it', () => {
    expect(versionTag('7.3.0')).toBe('v7.3');
    expect(versionFileTag('7.3.0')).toBe('v7_3');
    expect(versionTag('7.3.1')).toBe('v7.3.1');
    expect(versionFileTag('7.3.1')).toBe('v7_3_1');
    expect(versionTag('7.0.0')).toBe('v7.0');
    expect(versionTag('18.13.0')).toBe('v18.13');
    expect(versionTag('7.10.0')).toBe('v7.10');
    expect(versionTag('8.0.10')).toBe('v8.0.10');
    expect(versionTag('7.0.0-dev')).toBe('v7.0.0-dev');
    expect(versionTag('')).toBe('');
  });
  it('the build tags are the tags of APP_VERSION', () => {
    expect(appVerTag()).toBe(versionTag(APP_VERSION));
    expect(appVerFileTag()).toBe(appVerTag().replace(/\./g, '_'));
  });
});
