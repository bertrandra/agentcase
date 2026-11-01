import { memo } from 'react';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { openDetail } from '@/ui/widgets/DetailLinks';

/**
 * A programme activity named in a 📅 Plan table (WBS, dictionary, RAM, schedule): its name opens it in 🧩 Process, and "📋" opens it in
 * 📋 Programme, its row selected with its editor open (SPEC_FIXES FX-20). Both are view state only. Memoised: an edit redraws no link.
 */
export const PlanLink = memo(function PlanLink({ id, name }: { id: string; name: string }) {
  return (
    <>
      <button type="button" className="ac-link" onClick={() => openActivity(id)} aria-label={`Open ${name} in Process`}>{name}</button>
      {' '}<button type="button" className="ac-link" onClick={() => openDetail('programme', id)} aria-label={`Open ${name} in 📋 Programme`}
        title="Open in 📋 Programme">📋</button>
    </>
  );
});
