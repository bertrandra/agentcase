import note from '@/content/refshare/newbuild.json';
import { Callout } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';

/** Maps the legacy architecture vocabulary (BUS, PM, DEP…) to the modules of the TypeScript build. */
export function NewBuildNote() {
  return <Callout><details><summary><strong>{note.title}</strong></summary><Rich nodes={note.body} /></details></Callout>;
}
