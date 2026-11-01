/** @calc-zone scope-automation */
/**
 * Where the BPMN editor (bpmn-js Modeler, docs/SPEC_BPMN.md D-B6 b, phase B6) comes from. In the dev server and the tests: the package and its
 * style sheets, imported on demand. In the production build this module is REPLACED by the `bpmnPayload` plugin of vite.config.ts with one that
 * decompresses the copy embedded in the single file (`processEditorInline.ts`, the ExcelJS pattern of decision D5), so the app's code does not carry
 * bpmn-js: nothing of it is parsed or run before the user opens the editor.
 */
export interface BpmnModeler {
  /** `diagram`: the id of the `BPMNDiagram` to open (bpmn-js opens the first one without it) */
  importXML(xml: string, diagram?: string): Promise<{ warnings: unknown[] }>;
  saveXML(options: { format: boolean }): Promise<{ xml?: string }>;
  on(event: string, callback: () => void): void;
  get(service: string): unknown;
  destroy(): void;
}
export type ModelerClass = new (options: { container: HTMLElement }) => BpmnModeler;
/** The editor class and its style sheets (diagram-js, bpmn-js, the BPMN icon font embedded as a data: URL). */
export interface BpmnKit { Modeler: ModelerClass; css: string }

export async function bpmnSource(): Promise<BpmnKit> {
  const [m, ...css] = await Promise.all([import('bpmn-js/lib/Modeler'), import('bpmn-js/dist/assets/diagram-js.css?inline'),
    import('bpmn-js/dist/assets/bpmn-js.css?inline'), import('bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css?inline')]);
  return { Modeler: m.default as unknown as ModelerClass, css: css.map((c) => c.default).join('\n') };
}
