import content from '@/content/refshare/arch-layers.json';
import { StaticSection } from '../StaticSection';

/** Architecture — Layers: the one-screen index of the four code layers, the engines and mechanisms, and the registries (content in JSON). */
export default function ArchLayersSection() {
  return <StaticSection content={content} />;
}
