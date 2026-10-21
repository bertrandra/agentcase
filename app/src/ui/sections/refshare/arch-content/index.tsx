import content from '@/content/refshare/arch-content.json';
import { StaticSection } from '../StaticSection';
import { NewBuildNote } from '../NewBuildNote';

/** Architecture — Layers content: the full technical companion (functions, wiring status, data flow). The back link is part of the content. */
export default function ArchContentSection() {
  return <StaticSection content={content} before={<NewBuildNote />} />;
}
