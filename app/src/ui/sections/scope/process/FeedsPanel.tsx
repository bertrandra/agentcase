import { memo, useState } from 'react';
import { FEED_KEYS, FEED_LABELS, type FeedId } from '@/domain/process/feeds';
import { CheckInput } from '@/ui/widgets/fields';

/**
 * "The process model feeds the engine" (SPEC_FIXES FX-D8): one tick box per factor, off by default (off: the figures are today's). Collapsed until
 * opened (its fields render then only).
 */
export const FeedsPanel = memo(function FeedsPanel() {
  const [open, setOpen] = useState(false);
  return (
    <section className="ac-proc-feeds" aria-label="The process model feeds the engine">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} The process model feeds the engine</button>
      {open && (
        <fieldset className="ac-proc-fields">
          <legend>Factors read from the process (each off by default)</legend>
          {(Object.keys(FEED_KEYS) as FeedId[]).map((id) => <CheckInput key={id} id={FEED_KEYS[id]} label={FEED_LABELS[id]} />)}
          <p className="ac-muted">A factor the process does not give (no compensation handler, no cycle timer, no hand-off, no timer event) leaves its
            coefficient as it is. The token profile (code / prose) belongs to the harness token model (SPEC_HARNESS § 11).</p>
        </fieldset>
      )}
    </section>
  );
});
