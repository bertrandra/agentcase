import content from '@/content/refshare/sources.json';
import { StaticSection } from '../StaticSection';

/** Sources & Data — traceability of the reference classification and the external benchmarks. */
export default function SourcesSection() {
  return <StaticSection content={content} />;
}
