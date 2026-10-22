// Keyboard-only checks on the live page: the Tab walk (skip link first, every visible control reachable, no trap, a visible focus indicator,
// no positive tabindex), dialogs (if one is open it must trap Tab), and focus survival when a focused control unmounts (guided bar, ☰ Menu).
const FOCUSABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]';

/** Describe the focused element (a stable path, whether it sits in a dialog, and whether something visible marks the focus). */
const describeFocus = () => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const path = (n) => { const p = []; for (; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : `:${[...n.parentElement.children].indexOf(n)}`)); return p.join('>'); };
  const cs = getComputedStyle(el), ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
  return { key: path(el), label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40), ring, inDialog: !!el.closest('[role=dialog],[aria-modal=true],dialog[open]') };
};
/** Every control a keyboard user should be able to reach: visible, enabled, tabindex >= 0. */
const reachable = (sel) => [...document.querySelectorAll(sel)].filter((e) => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[hidden]'))
  .map((e) => { const p = []; for (let n = e; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : `:${[...n.parentElement.children].indexOf(n)}`)); return p.join('>'); });

const toTop = () => { document.activeElement?.blur(); window.scrollTo(0, 0); const s = document.createElement('span'); s.tabIndex = -1; document.body.prepend(s); s.focus(); s.remove(); };   // sequential focus restarts at the top

/** Tab through the page from the top; `note(rule, impact, help, target)` records findings. */
export async function tabWalk(page, note, cap = 600) {
  await page.evaluate(toTop);
  const seen = [], keys = new Set();
  let trap = null;
  for (let i = 0; i < cap; i++) {
    await page.keyboard.press('Tab'); await page.waitForTimeout(200);   // let the 150 ms `transition: all` of the nav buttons finish: the outline grows from 0 to 2px
    const f = await page.evaluate(describeFocus);
    if (!f) break;                                   // focus left the document (browser chrome) or went to the body
    if (keys.has(f.key)) { if (seen.length && f.key === seen[0].key) break; trap = f; break; }   // wrapped to the first stop = a full cycle; anything else = a trap
    keys.add(f.key); seen.push(f);
  }
  if (trap) note('kbd-trap', 'critical', 'Tab revisits a control before the walk ends: a keyboard trap', trap.key);
  if (seen.length >= cap) note('kbd-trap', 'critical', `Tab did not leave or cycle within ${cap} stops`, seen.at(-1).key);
  if (!seen.length) note('kbd-no-stops', 'critical', 'Tab reaches no control', 'body');
  else if (!/Skip to content/.test(seen[0].label)) note('kbd-skip-link-first', 'serious', 'The skip link must be the first Tab stop', seen[0].key);
  for (const s of seen) if (!s.ring) note('kbd-no-focus-indicator', 'serious', 'A focused control shows no outline or shadow', s.key);
  const want = await page.evaluate(reachable, FOCUSABLE), got = new Set(seen.map((s) => s.key));
  if (!trap) for (const k of want) if (!got.has(k)) note('kbd-unreachable', 'serious', 'A visible control is not reached by Tab', k);
  const positive = await page.evaluate(() => [...document.querySelectorAll('[tabindex]')].filter((e) => e.tabIndex > 0).map((e) => e.tagName));
  if (positive.length) note('kbd-positive-tabindex', 'moderate', 'A positive tabindex overrides the natural order', positive[0]);
  return seen.length;
}

/** Skip link: Enter moves focus into main. */
export async function skipLink(page, note) {
  await page.evaluate(toTop);
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  if (!(await page.evaluate(() => document.activeElement?.id === 'main'))) note('kbd-skip-link-target', 'serious', 'The skip link does not move focus to main', 'a.ac-skip');
}

/** A modal dialog, when one is open, keeps Tab inside it and closes on Escape with focus returned to its opener. */
export async function dialogCheck(page, note, opener) {
  if (!(await page.$('[role=dialog],[aria-modal=true],dialog[open]'))) return false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab'); await page.waitForTimeout(200);   // let the 150 ms `transition: all` of the nav buttons finish: the outline grows from 0 to 2px
    const f = await page.evaluate(describeFocus);
    if (f && !f.inDialog) { note('kbd-dialog-focus-escapes', 'serious', 'Tab leaves the open dialog', f.key); break; }
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  if (await page.$('[role=dialog],[aria-modal=true],dialog[open]')) note('kbd-dialog-escape', 'serious', 'Escape does not close the dialog', 'dialog');
  else if (opener && !(await page.evaluate((s) => document.activeElement === document.querySelector(s), opener))) note('kbd-dialog-focus-return', 'serious', 'Focus is not returned to the opener', opener);
  return true;
}

/** Activate a control from the keyboard and check that focus stays on a real element afterwards (inside `within` when given). */
export async function focusSurvives(page, note, label, selector, within) {
  const el = page.locator(selector).first();
  if (!(await el.count())) return;
  await el.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const ok = await page.evaluate((w) => { const a = document.activeElement; return !!a && a !== document.body && (!w || !!a.closest(w)); }, within || '');
  if (!ok) note('kbd-focus-lost', 'serious', `Focus falls to the page after: ${label}`, selector);
}
