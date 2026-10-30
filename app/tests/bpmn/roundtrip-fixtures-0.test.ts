// @vitest-environment jsdom
/** BPMN B2 round trip (spec § 11.2) on the oracle fixtures, shard 1 of 3 (the helper holds the assertions). */
import { describe, it } from 'vitest';
import { fixtureRoundTrip, shard } from '../helpers/bpmnRoundTrip';

describe('B2 round trip: export → parse → write byte-identical, views == v2 keys (fixtures 1/3)', () => {
  it.each(shard(0, 3))('fixture %s', (id) => fixtureRoundTrip(id), 20000);
});
