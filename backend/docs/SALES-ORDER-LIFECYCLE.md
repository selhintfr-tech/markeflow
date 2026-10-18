# Sales order lifecycle and integration contract

Sales data is workspace-scoped and intentionally separates `sales_customers`,
`sales_orders`, and `sales_shipments`. A customer can own many orders, and an
order can have one or more shipment records. Order status, payment status,
shipment status, and COD collection status are independent fields.

## Order statuses

The order status values are `Pending`, `Confirmed`, `Shipping`, `Delivered`,
`Returned`, and `Rejected`. A new order starts as `Pending`. Status changes are
recorded in `sales_order_status_history`; requesting the order's current status
is an idempotent no-op and does not add another history record. Status history
includes the previous and new values, timestamp, actor when known, source, and
optional metadata.

Shipment updates for `In transit`, `Delivered`, and `Returned` map to order
statuses `Shipping`, `Delivered`, and `Returned`, respectively. Shipment
changes to other statuses leave the order status unchanged. The shared
`OrderLifecycle` service performs transitions for manual actions and future
shipment adapters, so adapters should call that service rather than directly
mutating an order's status.

## Integration-ready lifecycle events

No Meta Conversions API or delivery-provider requests are made by this module.
Future integrations can consume the following documented domain event names
and record context:

| Event name | Trigger | Minimum event data |
| --- | --- | --- |
| `order.created` | Order and initial shipment are persisted | `workspace_id`, `order_id`, `order_number`, `customer_id`, `total`, `currency`, `source`, `occurred_at` |
| `order.status_changed` | A non-duplicate order status transition is committed | `workspace_id`, `order_id`, `from_status`, `to_status`, `source`, `actor_id`, `occurred_at` |
| `order.payment_status_changed` | Payment state changes | `workspace_id`, `order_id`, `payment_status`, `total`, `currency`, `occurred_at` |
| `shipment.status_changed` | Shipment state changes | `workspace_id`, `shipment_id`, `order_id`, `delivery_company_id`, `tracking_number`, `shipment_status`, `occurred_at` |
| `shipment.cod_collection_changed` | COD collection state changes | `workspace_id`, `shipment_id`, `order_id`, `cod_amount`, `payment_collection_status`, `currency`, `occurred_at` |

These names and payload fields are the integration contract to build on; event
dispatch, retries, provider APIs, external identifiers, and Meta CAPI delivery
remain out of scope here.
