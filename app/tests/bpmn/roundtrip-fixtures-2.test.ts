// @vitest-environment jsdom
/** BPMN B2 round trip (spec § 11.2) on the oracle fixtures, shard 3 of 3 (the helper holds the assertions), and the shard split itself. */
import { describe, expect, it } from 'vitest';
import { FIXTURE_IDS, fixtureRoundTrip, shard } from '../helpers/bpmnRoundTrip';

describe('B2 round trip: export → parse → write byte-identical, views == v2 keys (fixtures 3/3)', () => {
  it('the three shards cover the 107 oracle fixtures once', () => {
    expect(FIXTURE_IDS).toHaveLength(107);
    expect([...shard(0, 3), ...shard(1, 3), ...shard(2, 3)].sort()).toEqual(FIXTURE_IDS);
  });
  it.each(shard(2, 3))('fixture %s', (id) => fixtureRoundTrip(id), 20000);
});
