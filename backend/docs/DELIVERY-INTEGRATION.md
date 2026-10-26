# Delivery integration foundation

This module provides workspace-scoped provider credentials, shipment records,
normalized tracking history, webhook deduplication, and a provider adapter
contract. No Moroccan carrier adapter is enabled or represented as verified:
official API documentation and valid sandbox credentials were not available
for this delivery task.

## Provider adapter requirements

Bind each implementation as a Laravel container tag named
`delivery.providers`. An adapter must implement
`App\Services\Delivery\DeliveryProviderAdapter` and must:

- use only the carrier's official, current API and documented authentication;
- explicitly map its carrier statuses to the module's normalized statuses;
- verify webhook signatures over the exact documented raw request content
  before parsing or processing events;
- emit a stable provider event ID and tracking number for every webhook event;
- avoid including credentials, request bodies, or personal data in exceptions
  and logs; and
- report `cod_collected` only when the carrier explicitly reports collection.

Supported normalized statuses are `pending`, `label_created`, `picked_up`,
`in_transit`, `out_for_delivery`, `delivered`, `failed`, `returned`,
`cancelled`, and `unknown`. `delivered` does not mean that cash-on-delivery was
collected and does not trigger a Meta Purchase event.

| Candidate carrier | Verification state | Carrier-specific material required before enabling |
| --- | --- | --- |
| Ozon Express (Morocco) | Enabled (Safe First Phase, Dry-run / Read-only default). | Endpoints documented: `add-parcel`, `parcel-info`, `tracking` (single/bulk), `add-delivery-note`, `add-parcel-to-delivery-note`, `save-delivery-note`. Unverified: webhooks & listing all parcels (not supported until documented). |
| Amana / Barid Al-Maghrib | Not verified; no official API pack or sandbox credentials supplied. | Amana merchant API specification and version, sandbox account/API credentials, create/label/cancel/tracking schemas, Morocco-specific status list, COD collection/remittance semantics, signed webhook specification, limits, and sandbox cases. |
| Cathedis | Not verified; no official API pack or sandbox credentials supplied. | Cathedis merchant API specification and version, sandbox account/API credentials, create/label/cancel/tracking schemas, status dictionary, COD collection/remittance semantics, signed webhook specification, limits, and sandbox cases. |
| Aramex Morocco | Not verified; no official API pack or sandbox credentials supplied. | Aramex's official Morocco account/API product documentation and sandbox credentials, enabled shipment/tracking services, request/response schemas, status/COD semantics, webhook signing/retries, limits, and sandbox cases. |
| Chrono Diali | Not verified; no official API pack or sandbox credentials supplied. | Chrono Diali merchant API specification and version, sandbox account/API credentials, create/label/cancel/tracking schemas, status dictionary, COD collection/remittance semantics, signed webhook specification, limits, and sandbox cases. |
| Jibli | Not verified; no official API pack or sandbox credentials supplied. | Jibli merchant API specification and version, sandbox account/API credentials, create/label/cancel/tracking schemas, status dictionary, COD collection/remittance semantics, signed webhook specification, limits, and sandbox cases. |

This candidate list is not exhaustive and does not assert that a particular
carrier offers a public API or sandbox. Obtain the named materials directly
from the carrier before implementing its adapter. Specifically verify:

1. Production and sandbox base URLs, API version, and allowed network/TLS rules.
2. Credential provisioning, authentication headers/token lifetime, and rotation.
3. Shipment create/cancel/label request and response schemas, required recipient
   fields, accepted units, fees, and COD representation.
4. Tracking response status dictionary, timestamp timezone, and COD remittance
   semantics.
5. Webhook registration, signature algorithm/header/canonicalization, retry
   behavior, event ID guarantees, and delivery IP/network requirements.
6. Rate limits, timeout/retry policy, error codes, and sandbox test cases.

Until this evidence is verified, a saved connection is marked `unverified`;
connection tests, provider shipment creation, tracking refresh, and webhook
processing are unavailable unless an adapter is explicitly installed.

## Sales & Orders contract (Agent 14)

`delivery_shipments.sales_order_id` is a nullable UUID intentionally stored
without a foreign key because Sales & Orders owns its schema. Sales & Orders
may write the stable order UUID to this field and its human-readable order
number to `order_reference`. A shipment is tenant-scoped independently and must
be created/read using the active workspace; never trust a client-supplied
workspace ID. Verify order ownership in the caller before linking it. Avoid
editing or depending on a specific Sales & Orders table/model in this module.

Shipment fields `delivery_fee` and `cod_amount` are decimal currency amounts
in the associated workspace/order currency; this module does not perform
currency conversion or settle COD. `cod_collected` is separate from shipment
status and must only be set from an explicit carrier collection confirmation
or an authorized manual reconciliation. Delivery events never update payment
state or emit a Meta Purchase.

An adapter's `createShipment` receives `shipment_data` as a provider-neutral
object plus a stable `idempotency_key` (the local shipment UUID) and must return
a tracking number. The provider payload is encrypted at rest so a failed create
can be retried at `POST /api/delivery/shipments/{id}/dispatch` without changing
the key. The adapter must use the carrier's documented idempotency support;
never emulate idempotency with an invented carrier field. Its optional fee/COD
values override the corresponding values supplied to the shipment endpoint.

## Webhooks and retries

Configure a carrier to POST its documented event payload to
`POST /api/delivery/webhooks/{connectionId}`. The UUID identifies the candidate
connection only; authenticity is accepted solely by that adapter's verified
signature implementation. The module records `(connection, provider event ID)`
uniquely and applies each event at most once. Unknown tracking numbers are
recorded as processed to stop repeated delivery; later shipment creation does
not retroactively apply such events. Provider network failures return errors,
store only a generic safe message, and can be retried through the refresh API
where the adapter supports tracking.

## API surface

All routes except the signed webhook require an authenticated session, a valid
`X-Workspace-Id`, active workspace membership, and module write access where
applicable:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/delivery/connections` | List provider connection status and capabilities (never credentials). |
| POST | `/api/delivery/connections` | Save/replace encrypted credentials with `{provider_key, credentials}`. |
| POST | `/api/delivery/connections/{id}/test` | Test credentials when an adapter supports it. |
| DELETE | `/api/delivery/connections/{id}` | Disconnect and remove encrypted credentials. |
| GET | `/api/delivery/shipments` | Paginated shipment status/history. |
| POST | `/api/delivery/shipments` | Create a manual shipment record or persist and dispatch a provider shipment. |
| POST | `/api/delivery/shipments/{id}/dispatch` | Retry a failed create using the same shipment UUID idempotency key. |
| POST | `/api/delivery/shipments/{id}/refresh` | Refresh tracking where the adapter is installed. |
| POST | `/api/delivery/webhooks/{connectionId}` | Accept signature-verified, idempotent carrier events. |

## Route registration

The application owner must add `require base_path('routes/delivery.php');` to
the central API route registration. This task intentionally does not edit
`routes/api.php`, shared application routes, or navigation. The React page is
exported from `src/features/delivery/DeliveryIntegrationsPage.tsx`; expose it
through a delivery-module route/navigation entry in the owning integration
change.
