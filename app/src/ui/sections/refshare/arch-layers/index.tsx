import content from '@/content/refshare/arch-layers.json';
import { StaticSection } from '../StaticSection';
import { NewBuildNote } from '../NewBuildNote';

/** Architecture — Layers: the one-screen index of the calculation chain, the engines and the registries. */
export default function ArchLayersSection() {
  return <StaticSection content={content} before={<NewBuildNote />} />;
}
