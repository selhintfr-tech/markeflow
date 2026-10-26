import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiError, apiRequest, setApiSessionScope } from './apiClient.ts';

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.fetch = originalFetch;
  setApiSessionScope(null);
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
});

test('identical in-flight reads are deduplicated for the current user and workspace', async () => {
  let calls = 0;
  let release;
  setApiSessionScope('user-1');
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => { release = resolve; });
    return new Response(JSON.stringify({ data: ['same'] }), { status: 200 });
  };

  const first = apiRequest('/api/campaigns', { workspaceId: 'workspace-1' });
  const duplicate = apiRequest('/api/campaigns', { workspaceId: 'workspace-1' });
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await first, { data: ['same'] });
  assert.deepEqual(await duplicate, { data: ['same'] });
});

test('GET requests are not shared across authenticated users', async () => {
  let calls = 0;
  const releases = [];
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => releases.push(resolve));
    return new Response(JSON.stringify({ data: [calls] }), { status: 200 });
  };

  setApiSessionScope('user-1');
  const first = apiRequest('/api/workspaces');
  setApiSessionScope('user-2');
  const second = apiRequest('/api/workspaces');
  await Promise.resolve();
  assert.equal(calls, 2);
  releases.forEach((resolve) => resolve());
  await Promise.all([first, second]);
});

test('cached GET responses are scoped by user and workspace and invalidated by writes', async () => {
  let calls = 0;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ data: ++calls }),
    { status: 200 },
  );

  setApiSessionScope('user-1');
  const options = { workspaceId: 'workspace-1', cacheTtlMs: 30_000 };
  assert.deepEqual(await apiRequest('/api/campaigns', options), { data: 1 });
  assert.deepEqual(await apiRequest('/api/campaigns', options), { data: 1 });
  assert.equal(calls, 1);

  await apiRequest('/api/campaigns', { ...options, workspaceId: 'workspace-2' });
  assert.equal(calls, 2);
  setApiSessionScope('user-2');
  await apiRequest('/api/campaigns', options);
  assert.equal(calls, 3);

  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url) => url === '/sanctum/csrf-cookie'
    ? new Response(null, { status: 204 })
    : new Response(JSON.stringify({ message: 'saved' }), { status: 200 });
  await apiRequest('/api/campaigns', { method: 'PATCH', body: {} });

  globalThis.fetch = async () => new Response(JSON.stringify({ data: ++calls }), { status: 200 });
  await apiRequest('/api/campaigns', options);
  assert.equal(calls, 4);
});

test('tenant-scoped reads use the authenticated session and active workspace UUID', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  await apiRequest('/api/projects', { workspaceId: 'workspace-uuid' });

  assert.equal(request.url, '/api/projects');
  assert.equal(request.options.credentials, 'include');
  assert.equal(request.options.headers.get('X-Workspace-Id'), 'workspace-uuid');
  assert.equal(request.options.headers.get('Accept'), 'application/json');
});

test('Meta-sensitive reads can bypass browser HTTP cache', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  await apiRequest('/api/integrations/meta/historical-studies?account_id=act_123', {
    workspaceId: 'workspace-uuid',
    cache: 'no-store',
  });

  assert.equal(request.options.credentials, 'include');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.headers.get('X-Workspace-Id'), 'workspace-uuid');
});

test('stalled API requests reject with an explicit timeout error', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback) => {
    queueMicrotask(callback);
    return 1;
  };
  globalThis.fetch = async (_url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  });

  try {
    await assert.rejects(
      apiRequest('/api/projects'),
      /API request timed out after 30 seconds/,
    );
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('writes initialize CSRF and send the XSRF token with JSON credentials', async () => {
  const requests = [];
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf%2Btoken' };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return url === '/sanctum/csrf-cookie'
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ data: { id: 'created' } }), { status: 201 });
  };

  const payload = { name: 'New project' };
  const result = await apiRequest('/api/projects', {
    method: 'POST',
    workspaceId: 'workspace-uuid',
    body: payload,
  });

  assert.equal(requests[0].url, '/sanctum/csrf-cookie');
  assert.equal(requests[0].options.credentials, 'include');
  assert.equal(requests[1].options.credentials, 'include');
  assert.equal(requests[1].options.headers.get('X-XSRF-TOKEN'), 'csrf+token');
  assert.equal(requests[1].options.headers.get('X-Workspace-Id'), 'workspace-uuid');
  assert.equal(requests[1].options.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(requests[1].options.body), payload);
  assert.deepEqual(result, { data: { id: 'created' } });
});

test('multipart writes preserve the browser boundary and authenticated CSRF session', async () => {
  const requests = [];
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return url === '/sanctum/csrf-cookie'
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ data: { avatar_url: '/storage/avatars/photo.png' } }), { status: 200 });
  };

  const body = new FormData();
  body.append('avatar', new Blob(['image bytes'], { type: 'image/png' }), 'avatar.png');
  const result = await apiRequest('/api/profile/avatar', { method: 'POST', body });

  assert.equal(requests[1].options.credentials, 'include');
  assert.equal(requests[1].options.headers.get('X-XSRF-TOKEN'), 'csrf-token');
  assert.equal(requests[1].options.headers.has('Content-Type'), false);
  assert.equal(requests[1].options.body, body);
  assert.equal(result.data.avatar_url, '/storage/avatars/photo.png');
});

test('failed API responses preserve HTTP status and Laravel validation errors', async () => {
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url) => url === '/sanctum/csrf-cookie'
    ? new Response(null, { status: 204 })
    : new Response(JSON.stringify({
      message: 'The given data was invalid.',
      errors: { name: ['The name field is required.'] },
    }), { status: 422 });

  await assert.rejects(
    apiRequest('/api/projects', { method: 'POST', body: {} }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 422);
      assert.deepEqual(error.errors, { name: ['The name field is required.'] });
      return true;
    },
  );
});
