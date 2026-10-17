import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { ApiError, apiRequest } from './apiClient.ts';

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
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
