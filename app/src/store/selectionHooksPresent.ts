import { aggregateCommercial, aggregatePlayback, aggregateStory, type CommercialAgg, type PlaybackAgg, type StoryAgg } from '@/domain/portfolio';
import { useAggregate } from './selectionHooksEconomics';

/** Section Monthly Playback: the trajectory of the View (consolidated series; velocity weighted by entry headcount). */
export const usePlaybackAggregate = (): PlaybackAgg | null => useAggregate(aggregatePlayback);
/** Section "The story so far": AS-IS to TO-BE of the View, and the story of each product. */
export const useStoryAggregate = (): StoryAgg | null => useAggregate(aggregateStory);
/** Section Commercial model: the selected model of each product of the View and the roll-up of the contracts. */
export const useCommercialAggregate = (): CommercialAgg | null => useAggregate(aggregateCommercial);
