import type { Epic, Feature, Portfolio, Story, Vision } from '@/domain/factory/types';
import { useDoc } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { useList } from '../data';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const box = (color: string, left: number) => ({ marginLeft: left, padding: '3px 8px', borderLeft: `${left ? 2 : 3}px solid ${color}`, fontSize: 'var(--ac-font-size-md)' });

/** Vision → Portfolio → Epic → Feature → Story as a structure (these records carry no dates, so this is a hierarchy, not a calendar). */
export function BusinessChain() {
  const vision = useDoc((d) => ((d as Record<string, unknown>).VISION as Vision | undefined)?.statement ?? '');
  const ports = useList<Portfolio>('PORTFOLIO_ITEMS'), epics = useList<Epic>('EPICS'), feats = useList<Feature>('FEATURES'), stories = useList<Story>('STORIES');
  return (
    <Panel title="🏢 Business chain">
      <p>🎯 <strong>Vision:</strong> {vision || <span className="ac-muted">(not set)</span>}</p>
      {ports.length ? ports.map((p) => {
        const eps = epics.filter((e) => e.portfolioId === p.id);
        return (
          <div key={p.id} style={box('var(--ac-blue)', 0)}>📁 <strong>{p.name}</strong> <span className="ac-muted">({plural(eps.length, 'epic', 'epics')})</span>
            {eps.map((e) => {
              const fs = feats.filter((f) => f.epicId === e.id);
              return (
                <div key={e.id} style={box('var(--ac-teal)', 12)}>🧩 <strong>{e.name}</strong> <span className="ac-muted">({plural(fs.length, 'feature', 'features')})</span>
                  {fs.map((f) => (
                    <div key={f.id} style={box('var(--ac-secondary-600)', 24)}>⭐ <strong>{f.name}</strong> <span className="ac-muted">({plural(stories.filter((s) => s.featureId === f.id).length, 'story', 'stories')})</span></div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      }) : <p className="ac-muted">No portfolio/epic/feature structure yet — add some in 🏭 Factory Model.</p>}
    </Panel>
  );
}
