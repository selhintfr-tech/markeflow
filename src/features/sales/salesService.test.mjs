import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { salesService } from './salesService.ts';
import { ApiError, setApiSessionScope } from '../api/apiClient.ts';

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.fetch = originalFetch;
  setApiSessionScope(null);
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
});

test('deleteOrder issues DELETE to /api/sales/orders/{id} with workspace header', async () => {
  const requests = [];
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 });
    }
    return new Response(
      JSON.stringify({ message: 'Order deleted successfully.', data: { id: 'order-123', order_number: 'ORD-TEST' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const response = await salesService.deleteOrder('ws-456', 'order-123');

  assert.equal(requests[0].url, '/sanctum/csrf-cookie');
  assert.equal(requests[1].url, '/api/sales/orders/order-123');
  assert.equal(requests[1].options.method, 'DELETE');
  assert.equal(requests[1].options.headers.get('X-Workspace-Id'), 'ws-456');
  assert.deepEqual(response, {
    message: 'Order deleted successfully.',
    data: { id: 'order-123', order_number: 'ORD-TEST' },
  });
});

test('deleteOrder propagates backend validation failure when order has active records', async () => {
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url) => {
    if (url === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 });
    }
    return new Response(
      JSON.stringify({
        message: 'This order cannot be deleted because it is linked to recorded financial ledger transactions.',
        code: 'ORDER_HAS_TRANSACTIONS',
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  };

  await assert.rejects(
    salesService.deleteOrder('ws-456', 'order-has-tx'),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 422);
      assert.match(err.message, /recorded financial ledger transactions/);
      return true;
    }
  );
});

test('updateOrderStatus transitions order status to Cancelled (reversible soft cancellation)', async () => {
  let patchRequest;
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url, options) => {
    if (url === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 });
    }
    patchRequest = { url, options };
    return new Response(
      JSON.stringify({
        data: {
          id: 'order-999',
          order_number: 'ORD-999',
          status: 'Cancelled',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const updated = await salesService.updateOrderStatus('ws-456', 'order-999', 'Cancelled');

  assert.equal(patchRequest.url, '/api/sales/orders/order-999/status');
  assert.equal(patchRequest.options.method, 'PATCH');
  assert.equal(patchRequest.options.headers.get('X-Workspace-Id'), 'ws-456');
  assert.deepEqual(JSON.parse(patchRequest.options.body), { status: 'Cancelled' });
  assert.equal(updated.status, 'Cancelled');
});

test('updateOrderStatus with sync_shipment passes flag to synchronize carrier delivery', async () => {
  let patchRequest;
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url, options) => {
    if (url === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 });
    }
    patchRequest = { url, options };
    return new Response(
      JSON.stringify({
        data: {
          id: 'order-sync-1',
          order_number: 'ORD-SYNC-1',
          status: 'Delivered',
          shipments: [{ id: 'ship-1', status: 'Delivered' }],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const updated = await salesService.updateOrderStatus('ws-456', 'order-sync-1', 'Delivered', true);

  assert.equal(patchRequest.url, '/api/sales/orders/order-sync-1/status');
  assert.deepEqual(JSON.parse(patchRequest.options.body), {
    status: 'Delivered',
    sync_shipment: true,
  });
  assert.equal(updated.status, 'Delivered');
  assert.equal(updated.shipments[0].status, 'Delivered');
});

test('updateCustomer issues PATCH to /api/sales/customers/{id} with input payload', async () => {
  let patchRequest;
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url, options) => {
    if (url === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 });
    }
    patchRequest = { url, options };
    return new Response(
      JSON.stringify({
        data: {
          id: 'cust-101',
          first_name: 'Younes',
          last_name: 'Amnay',
          phone: '0623280227',
          orders_count: 1,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const updated = await salesService.updateCustomer('ws-456', 'cust-101', {
    first_name: 'Younes',
    last_name: 'Amnay',
    phone: '0623280227',
  });

  assert.equal(patchRequest.url, '/api/sales/customers/cust-101');
  assert.equal(patchRequest.options.method, 'PATCH');
  assert.equal(patchRequest.options.headers.get('X-Workspace-Id'), 'ws-456');
  assert.equal(updated.id, 'cust-101');
  assert.equal(updated.phone, '0623280227');
});

test('deleteCustomer issues DELETE to /api/sales/customers/{id}', async () => {
  let deleteRequest;
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url, options) => {
    if (url === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 });
    }
    deleteRequest = { url, options };
    return new Response(
      JSON.stringify({
        message: 'Customer deleted successfully.',
        data: { id: 'cust-orphan', first_name: 'Younes', last_name: 'Amnay' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await salesService.deleteCustomer('ws-456', 'cust-orphan');

  assert.equal(deleteRequest.url, '/api/sales/customers/cust-orphan');
  assert.equal(deleteRequest.options.method, 'DELETE');
  assert.equal(deleteRequest.options.headers.get('X-Workspace-Id'), 'ws-456');
  assert.equal(result.message, 'Customer deleted successfully.');
  assert.equal(result.data.id, 'cust-orphan');
});

test('deleteCustomer propagates 422 error when customer has active orders', async () => {
  globalThis.document = { cookie: 'XSRF-TOKEN=csrf-token' };
  globalThis.fetch = async (url) => {
    if (url === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 });
    }
    return new Response(
      JSON.stringify({
        message: 'This customer cannot be deleted because they have 1 linked order(s).',
        code: 'CUSTOMER_HAS_ORDERS',
        orders_count: 1,
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  };

  await assert.rejects(
    salesService.deleteCustomer('ws-456', 'cust-has-orders'),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 422);
      assert.match(err.message, /linked order\(s\)/);
      return true;
    }
  );
});
