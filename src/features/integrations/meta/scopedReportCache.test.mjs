import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScopedReportCache } from './scopedReportCache.ts';

test('scoped reports are cached independently by user, workspace, and account', async () => {
  const cache = createScopedReportCache(60_000);
  let calls = 0;
  const load = async () => ({ value: ++calls });

  assert.deepEqual(await cache.get(['user-1', 'workspace-1', 'act_1'], load), { value: 1 });
  assert.deepEqual(await cache.get(['user-1', 'workspace-1', 'act_1'], load), { value: 1 });
  assert.deepEqual(await cache.get(['user-2', 'workspace-1', 'act_1'], load), { value: 2 });
  assert.deepEqual(await cache.get(['user-1', 'workspace-2', 'act_1'], load), { value: 3 });
  assert.deepEqual(await cache.get(['user-1', 'workspace-1', 'act_2'], load), { value: 4 });
});

test('identical in-flight reads are deduplicated and refresh replaces cached data', async () => {
  const cache = createScopedReportCache(60_000);
  let calls = 0;
  let release;
  const load = () => {
    calls += 1;
    return new Promise((resolve) => { release = resolve; });
  };
  const first = cache.get(['user-1', 'workspace-1', 'act_1'], load);
  const duplicate = cache.get(['user-1', 'workspace-1', 'act_1'], load);
  await Promise.resolve();
  assert.equal(calls, 1);
  release({ value: 'first' });
  assert.deepEqual(await first, { value: 'first' });
  assert.deepEqual(await duplicate, { value: 'first' });

  assert.deepEqual(
    await cache.get(['user-1', 'workspace-1', 'act_1'], async () => ({ value: 'refreshed' }), true),
    { value: 'refreshed' },
  );
  assert.deepEqual(
    await cache.get(['user-1', 'workspace-1', 'act_1'], async () => ({ value: 'unexpected' })),
    { value: 'refreshed' },
  );
});

test('expired entries are reloaded and scope clearing does not affect other users', async () => {
  let now = 0;
  const cache = createScopedReportCache(10, () => now);
  let calls = 0;
  const load = async () => ({ value: ++calls });

  await cache.get(['user-1', 'workspace-1', 'act_1'], load);
  now = 5;
  await cache.get(['user-2', 'workspace-1', 'act_1'], load);
  now = 11;
  assert.deepEqual(await cache.get(['user-1', 'workspace-1', 'act_1'], load), { value: 3 });
  cache.clear(['user-1', 'workspace-1']);
  assert.deepEqual(await cache.get(['user-2', 'workspace-1', 'act_1'], load), { value: 2 });
  assert.deepEqual(await cache.get(['user-1', 'workspace-1', 'act_1'], load), { value: 4 });
});
