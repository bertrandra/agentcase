import { setCustomerName } from '@/controllers/persona';
import { activateSnapshot, captureSnapshot, deleteSnapshot, renameSnapshot, setBaselineSnapshot } from '@/controllers/snapshots';
import type { Sample } from './types';

const T0 = new Date('2026-10-21T10:00:00Z');
const withOne = () => { captureSnapshot('First', T0, 'snap-a'); setCustomerName('Changed after capture'); };

/** One sample call per command type of the snapshot manager. */
export const samples: Record<string, Sample> = {
  'snapshots.capture': () => { captureSnapshot('First', T0, 'snap-a'); },
  'snapshots.rename': { prep: () => { captureSnapshot('First', T0, 'snap-a'); }, run: () => renameSnapshot('snap-a', 'Renamed') },
  'snapshots.delete': { prep: () => { captureSnapshot('First', T0, 'snap-a'); }, run: () => deleteSnapshot('snap-a') },
  'snapshots.activate': { prep: withOne, run: () => { activateSnapshot('snap-a'); } },
  'snapshots.baseline': { prep: withOne, run: () => { setBaselineSnapshot('snap-a'); } },
};
