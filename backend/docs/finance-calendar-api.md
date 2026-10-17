# Finance and Calendar API

These modules use the authenticated Laravel session and require the active workspace UUID in `X-Workspace-Id`. All endpoints are tenant-scoped. Owners, admins, and members may write; viewers have read-only access.

## Finance

- `GET /api/finance/budgets` — list budgets; optional `category`, `starts_on`, `ends_on`, `per_page`, and `page`.
- `POST /api/finance/budgets` — create a budget with `name`, `category`, decimal `amount`, `starts_on`, `ends_on`, and optional `notes`.
- `GET|PUT|PATCH|DELETE /api/finance/budgets/{budget}` — retrieve, update, or delete a budget.
- `GET /api/finance/transactions` — list expenses and income; optional `type` (`expense` or `income`), `category`, `from`, `to`, `per_page`, and `page`.
- `POST /api/finance/transactions` — create a transaction with `type`, `category`, decimal `amount`, `occurred_on`, and optional `description`.
- `GET|PUT|PATCH|DELETE /api/finance/transactions/{transaction}` — retrieve, update, or delete a transaction.
- `GET /api/finance/categories` — sorted categories currently used by budgets or transactions.
- `GET /api/finance/summary` — income, expenses, budget, actual spend, and remaining variance; optional `from` and `to`.

Tenant and creator IDs are assigned by the server, never accepted from request bodies. Money is stored in `DECIMAL(14,2)` columns.

## Calendar

- `GET /api/calendar/events` — list events; optional offset-bearing `from` and `to` timestamps, `project_id`, `task_id`, `per_page`, and `page`.
- `POST /api/calendar/events` — create an event with `title`, `starts_at`, `ends_at`, IANA `timezone`, and optional `description`, `project_id`, and `task_id`.
- `GET|PUT|PATCH|DELETE /api/calendar/events/{event}` — retrieve, update, or delete an event.

Event timestamps must include `Z` or an explicit `+/-HH:MM` offset; optional project/task relations must belong to the active workspace. The stored timestamps use timezone-aware database columns, and the original IANA timezone is retained.

## Route integration

Load `routes/finance.php` and `routes/calendar.php` from the shared API route file at top level (not inside the existing nested tenant middleware group); each file installs its own `web`, `auth`, `tenant`, and `tenant.required` middleware. For example:

```php
require __DIR__.'/finance.php';
require __DIR__.'/calendar.php';
```
