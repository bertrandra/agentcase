/** Collect mismatches between an oracle value and ours (numbers within 1e-6 relative; objects compared on the oracle's keys). */
export function nearDiff(exp: unknown, got: unknown, path = 'x', out: string[] = []): string[] {
  if (typeof exp === 'number') {
    if (!(typeof got === 'number' && Math.abs(got - exp) <= 1e-6 * Math.max(1, Math.abs(exp)))) out.push(`${path}: expected ${exp}, got ${String(got)}`);
  } else if (Array.isArray(exp)) {
    if (!Array.isArray(got) || got.length !== exp.length) out.push(`${path}: array length ${(got as unknown[])?.length} vs ${exp.length}`);
    else exp.forEach((v, i) => nearDiff(v, got[i], `${path}[${i}]`, out));
  } else if (exp && typeof exp === 'object') {
    for (const k of Object.keys(exp)) nearDiff((exp as Record<string, unknown>)[k], (got as Record<string, unknown> | undefined)?.[k], `${path}.${k}`, out);
  } else if (exp !== got) out.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
  return out;
}
