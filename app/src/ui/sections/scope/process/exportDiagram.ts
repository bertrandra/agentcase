import { downloadBlob, downloadText } from '@/ui/sections/refshare/download';

/**
 * The diagram as an image (owner's request 2026-11-05, for slides): the whole drawing (not the zoomed window), the overlays left out, each
 * element's computed style written on it so the file draws the same outside the app. SVG as is; PNG rendered at twice the size through a canvas.
 */
const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'font-weight', 'font-family',
  'text-anchor', 'dominant-baseline', 'display', 'visibility'];
const OVERLAYS = '.ac-bpmn-frozen, .ac-bpmn-ghost, .ac-bpmn-target, .ac-bpmn-edge-hit, .ac-bpmn-band, .ac-bpmn-selmore, .ac-bpmn-more, .ac-bpmn-edge-sel';

export function diagramSvgText(svg: SVGSVGElement, box: { x: number; y: number; w: number; h: number }): string {
  const copy = svg.cloneNode(true) as SVGSVGElement, src = [svg, ...svg.querySelectorAll('*')], dst = [copy, ...copy.querySelectorAll('*')];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el), to = dst[i] as SVGElement | undefined;
    if (to) to.setAttribute('style', PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).filter((x) => !x.endsWith(':')).join(';'));
  });
  copy.querySelectorAll(OVERLAYS).forEach((e) => e.remove());
  Object.entries({ xmlns: 'http://www.w3.org/2000/svg', viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`, width: `${Math.round(box.w)}`,
    height: `${Math.round(box.h)}` }).forEach(([k, v]) => copy.setAttribute(k, v));
  copy.removeAttribute('class');
  return new XMLSerializer().serializeToString(copy);
}

export function exportDiagram(svg: SVGSVGElement, box: { x: number; y: number; w: number; h: number }, name: string, kind: 'svg' | 'png'): void {
  const text = diagramSvgText(svg, box), file = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (kind === 'svg') { downloadText(`${file}.svg`, text, 'image/svg+xml'); return; }
  const img = new Image(), scale = 2, bg = getComputedStyle(svg.parentElement ?? svg).backgroundColor;
  img.onload = () => {
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(box.w * scale), height: Math.round(box.h * scale) });
    const g = c.getContext('2d');
    if (!g) return;
    g.fillStyle = bg;   // the canvas's own (themed) background
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => { if (b) downloadBlob(`${file}.png`, b); }, 'image/png');
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
}
