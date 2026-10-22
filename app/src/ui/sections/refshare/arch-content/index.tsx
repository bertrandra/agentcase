import content from '@/content/refshare/arch-content.json';
import { StaticSection } from '../StaticSection';

/** Architecture — Layers content: the full technical companion (modules, data flow of one action, formats, proof layer, known gaps). The back link is part of the content. */
export default function ArchContentSection() {
  return <StaticSection content={content} />;
}
