/**
 * jsdom has no PointerEvent: a MouseEvent carrying the pointer id and type is enough for the handlers under test (the s-curve editor, the process
 * diagram's pinch). Import for its side effect, before rendering.
 */
if (!('PointerEvent' in window)) {
  class PointerEventShim extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventShim });
}
export {};
