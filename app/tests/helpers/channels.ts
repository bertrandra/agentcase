import type { ChannelLike } from '@/store/persistence/broadcast';

/** Two BroadcastChannel ends wired to each other (each message structured-cloned, like the browser): tab A and tab B. */
export function channelPair(): [ChannelLike, ChannelLike] {
  const a: ChannelLike = { postMessage: () => undefined, onmessage: null, close: () => undefined };
  const b: ChannelLike = { postMessage: () => undefined, onmessage: null, close: () => undefined };
  a.postMessage = (m) => b.onmessage?.({ data: structuredClone(m) });
  b.postMessage = (m) => a.onmessage?.({ data: structuredClone(m) });
  return [a, b];
}

/**
 * A channel shared by any number of tabs (each message structured-cloned to every OTHER end, like the browser). `hold()` queues the messages instead
 * of delivering them (two tabs editing at the same moment), `release()` delivers the queue in order.
 */
export function channelBus() {
  const ends: ChannelLike[] = [], queue: (() => void)[] = [];
  let held = false;
  const end = (): ChannelLike => {
    const me: ChannelLike = { onmessage: null, close: () => undefined, postMessage: (m) => {
      for (const o of ends) {
        if (o === me) continue;
        const send = () => o.onmessage?.({ data: structuredClone(m) });
        if (held) queue.push(send); else send();
      }
    } };
    ends.push(me);
    return me;
  };
  const release = () => { held = false; while (queue.length) (queue.shift() as () => void)(); };
  return { end, hold: () => { held = true; }, release };
}
