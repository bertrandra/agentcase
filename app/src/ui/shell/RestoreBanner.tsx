import { useSyncExternalStore } from 'react';
import { acceptRestore, dismissRestore, getRestoreOffer, onRestoreOffer } from '@/controllers/boot';
import { focusMain } from '../focusRescue';

/** Offers the autosaved session of another tab (with its undo history). */
export function RestoreBanner() {
  const offer = useSyncExternalStore(onRestoreOffer, getRestoreOffer);
  if (!offer) return null;
  return (
    <div className="ac-banner" role="alert">
      Autosaved session “{offer.label}” from {new Date(offer.savedAt).toLocaleString()} ({offer.steps} change{offer.steps === 1 ? '' : 's'}).
      <button type="button" onClick={() => { acceptRestore(); focusMain(); }}>Restore</button>
      <button type="button" onClick={() => { dismissRestore(); focusMain(); }}>Dismiss</button>
    </div>
  );
}
