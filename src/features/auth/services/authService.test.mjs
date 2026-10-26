import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { authService } from './authService.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('concurrent current-user checks share one session request', async () => {
  let calls = 0;
  let release;
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/user');
    calls += 1;
    await new Promise((resolve) => { release = resolve; });
    return new Response(JSON.stringify({ id: 'user-1', name: 'Example User', email: 'user@example.test' }), {
      status: 200,
    });
  };

  const first = authService.getCurrentUser();
  const second = authService.getCurrentUser();
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await first, await second);
});
