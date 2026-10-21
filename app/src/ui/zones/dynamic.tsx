import { DynamicSectionPage } from '@/ui/sections/configure/board/DynamicSectionView';
import { SectionFrame } from './SectionFrame';
import type { DynSection } from '@/domain/pdc/board';
import { useDoc } from '@/store/hooks';

/** Navigation entry of a stored dynamic section (a record of the document's `dynamicSections`): the Board's live view in the standard frame. */
export function DynamicSection({ id }: { id: string }) {
  const title = useDoc((d) => ((d.dynamicSections as DynSection[] | undefined) ?? []).find((s) => s.id === id)?.title ?? 'Dashboard');
  return <SectionFrame title={title} result={<DynamicSectionPage id={id} />} />;
}
