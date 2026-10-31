import { caseValues } from '@/domain/process';
import { setInput } from '@/controllers/inputs';
import { WBS_KEY } from '@/domain/programme/wbs';
import { useDoc } from '@/store/hooks';
import { TextField } from '@/ui/widgets/CommitField';

/**
 * The WBS code override of a programme activity (docs/SPEC_BPMN.md § 19.8 F-B74; phase B9d): blank keeps the code derived from the WBS tree;
 * dotted digits (for example 1.3.2) replace it where the activity has one work package. Held by the case key `wbsCode-<kind>` until the stored
 * form (B9c), exported as `ac:wbsCode`; each edit is one undoable step. Edited here only, like every activity parameter (F-B72).
 */
export function WbsCodeField({ kind }: { kind: string }) {
  const value = useDoc((d) => caseValues(d)[WBS_KEY(kind)] ?? '');
  return (
    <div className="ac-proc-fields">
      <TextField label="WBS code (blank = derived from the tree; dotted digits override it)" value={value} placeholder="derived"
        onChange={(v) => setInput(WBS_KEY(kind), v.trim())} />
    </div>
  );
}
