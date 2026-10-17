# Analytics, Reports, and Comparisons API

All endpoints require an authenticated session and an authorized active workspace. Include the real workspace UUID in `X-Workspace-Id`. Responses are JSON unless an export endpoint is requested.

## Analytics

- `GET /api/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/analytics/timeseries?from=YYYY-MM-DD&to=YYYY-MM-DD`

Overview aggregates workspace projects, campaigns, tasks, CRM leads/customers, campaign budget/spend/revenue, and finance income/expenses/budgeted expenses. Each metric is `null` if its backing table or required columns are unavailable. The time series groups persisted values by source date. Sources use project `created_at`, campaign `start_date`, task `due_date`, CRM lead/customer `created_at`, and finance transaction `occurred_on`.

Task completion means status exactly `Completed`; lead conversion means status `Converted` or a non-null `converted_at`. Campaign financial totals use campaign-recorded fields; finance totals use finance transactions. They are deliberately kept separate. Profitability uses recorded income minus recorded expenses. No advertising-network metrics are inferred.

## Saved reports

- `GET /api/reports?type=finance`
- `POST /api/reports` — `{name,type,from_date?,to_date?,filters?,configuration?}`
- `GET /api/reports/{id}`
- `PATCH|PUT /api/reports/{id}`
- `DELETE /api/reports/{id}`
- `POST /api/reports/{id}/run` — generates current JSON data from supported workspace sources.
- `GET /api/reports/{id}/export.csv` — exports generated report data as metric/value CSV.

Supported report types: `overview`, `campaigns`, `tasks`, `crm`, `finance`, `timeseries`. Supported list filters: campaign reports accept `status` and `project_id`; task/CRM reports accept `status`; finance reports accept `type` and `category`. Saved definitions are workspace-scoped; results are generated at run/export time and are not cached.

## Comparisons

- `GET /api/comparisons/periods?from=YYYY-MM-DD&to=YYYY-MM-DD` — compares with the immediately preceding range of equal inclusive length.
- The period endpoint accepts paired `previous_from` and `previous_to` for a custom baseline.
- `GET /api/comparisons/campaigns?campaign_a={uuid}&campaign_b={uuid}` — compares budget, spend, revenue, leads and customers for campaigns in the active workspace.

Change is current/A minus previous/B. Percentage change is null when its baseline is zero or its data source is unavailable. Conversion/completion rates are compared in percentage points.

## Route integration

The shared API router must include `routes/analytics.php`, `routes/reports.php`, and `routes/comparisons.php` under the `api` prefix after central integration approval. This module intentionally leaves `routes/api.php` unchanged.
