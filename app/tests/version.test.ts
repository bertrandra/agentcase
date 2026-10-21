import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@/domain/version';

describe('version stamps stay in step', () => {
  const [maj, min] = APP_VERSION.split('.');
  it('package.json carries the same version', () => expect(JSON.parse(readFileSync('package.json', 'utf8')).version).toBe(APP_VERSION));
  it('index.html title carries major.minor', () => expect(readFileSync('index.html', 'utf8')).toContain(`<title>AgentCase v${maj}.${min} —`));
  it('is a release version (no pre-release suffix)', () => expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/));
});
