/**
 * Runs tools/bpmn-validate.mjs (BPMN 2.0.2 + DI OMG XSDs + the AgentCase extension XSD, through xmllint, after the F-B10 security checks)
 * on files and returns its JSON report. Used by tests/bpmn (phase B0 of docs/SPEC_BPMN.md).
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

export const REPO = resolve(process.cwd(), '..');
export const BPMN_FIXTURES = join(process.cwd(), 'fixtures', 'bpmn');
export const HOSTILE_FIXTURES = join(BPMN_FIXTURES, 'hostile');
const TOOL = join(REPO, 'tools', 'bpmn-validate.mjs');

export interface Finding { code: string; message: string }
export interface ValidationResult { file: string; ok: boolean; schema: 'valid' | 'invalid' | 'skipped'; errors: Finding[]; warnings: Finding[] }

/** True when xmllint (libxml2-utils) is installed: CI must have it (D-B7); a local run without it skips the schema tests. */
export const hasXmllint = (): boolean => spawnSync('xmllint', ['--version']).status === 0;

/** The schema tests run when xmllint is installed, and always in CI (where a missing xmllint must fail, not skip). */
export const schemaTestsRun = (): boolean => hasXmllint() || !!process.env.CI;

/** The JSON report of the validator for these files, with its exit code. `flags`: --no-schema, --strict. */
export function validate(files: string[], flags: string[] = []): { status: number | null; results: ValidationResult[]; stderr: string } {
  const res = spawnSync(process.execPath, [TOOL, '--json', ...flags, ...files], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const results = res.stdout.trim() ? (JSON.parse(res.stdout) as ValidationResult[]) : [];
  return { status: res.status, results, stderr: res.stderr };
}

export const codes = (r: ValidationResult | undefined): string[] => [...new Set((r?.errors ?? []).map((e) => e.code))].sort();
