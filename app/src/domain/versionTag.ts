/** @calc-zone foundation */
/**
 * Version tags, legacy appVerTag() / appVerFileTag() semantics (AgentCase_v18_13_EN.html): ONE trailing ".0" group is dropped, dots become
 * underscores in file names. "X.Y.0" → "vX.Y" / "vX_Y"; "X.Y.1" → "vX.Y.1" / "vX_Y_1"; "X.0.0" → "vX.0"; "" → "".
 * Pure and free of the injected build constant, so vite.config.ts (index.html title) applies the same rule as the app.
 */
export const versionTag = (v: string): string => (v ? `v${v.replace(/\.0+$/, '')}` : '');
export const versionFileTag = (v: string): string => versionTag(v).replace(/\./g, '_');
