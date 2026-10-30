import { createRequire } from 'node:module';

/**
 * Schema v3 (docs/SPEC_BPMN.md § 6.1): a saved case holds its process document as XML text, read back by the B2 reader with the browser's
 * DOMParser. Test files that run in the `node` environment get jsdom's DOMParser, loaded on first use only (jsdom test files have their own).
 */
if (typeof globalThis.DOMParser === 'undefined') {
  Object.defineProperty(globalThis, 'DOMParser', {
    configurable: true,
    get() {
      const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string) => { window: { DOMParser: typeof DOMParser } } };
      const parser = new JSDOM('').window.DOMParser;
      Object.defineProperty(globalThis, 'DOMParser', { value: parser, configurable: true, writable: true });
      return parser;
    },
  });
}
