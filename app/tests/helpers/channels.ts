import type { ChannelLike } from '@/store/persistence/broadcast';

/** Two BroadcastChannel ends wired to each other (each message structured-cloned, like the browser): tab A and tab B. */
export function channelPair(): [ChannelLike, ChannelLike] {
  const a: ChannelLike = { postMessage: () => undefined, onmessage: null, close: () => undefined };
  const b: ChannelLike = { postMessage: () => undefined, onmessage: null, close: () => undefined };
  a.postMessage = (m) => b.onmessage?.({ data: structuredClone(m) });
  b.postMessage = (m) => a.onmessage?.({ data: structuredClone(m) });
  return [a, b];
}
