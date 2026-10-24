/** @calc-zone foundation */
/** Injected by vite.config.ts `define` (build, dev server, Vitest, vite-node) from app/package.json "version": the ONLY place the version is written. */
declare const __APP_VERSION__: string;

/** Product version of the TypeScript build (the legacy single-file app is v18.x), "MAJOR.MINOR.PATCH". */
export const APP_VERSION: string = __APP_VERSION__;
export { versionFileTag, versionTag } from './versionTag';
