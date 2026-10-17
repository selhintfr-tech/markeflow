# Marketing Intelligence API

All APIs use the authenticated Laravel session and require the selected workspace UUID in `X-Workspace-Id`. The workspace must be active and membership is verified server-side. Owners, admins, and members can create/update/delete; viewers have read-only access. Lists use Laravel pagination (`data`, `links`, and `meta`); defaults to 15 records and accepts `per_page` from 1 to 100.

## Audiences — `/api/audiences`

- `GET /api/audiences` — optional `search`, `status` (`Draft`, `Active`, `Archived`), `campaign_id`, `per_page`, and `page`.
- `POST /api/audiences` — `name`; optional `description`, `demographics` (object), `locations` (string array), `interests` (string array), `characteristics` (string array), `segmentation_criteria` (object), `estimated_size`, `status`, `notes`, and `campaign_ids` (array of campaign UUIDs).
- `GET|PUT|PATCH|DELETE /api/audiences/{audience}` — retrieve, update, or delete. `campaign_ids` on update replaces campaign associations.

Workspace and creator IDs are derived from the verified context and authenticated user. Campaign associations must refer to campaigns in that workspace.

## Marketing Strategies — `/api/strategies`

- `GET /api/strategies` — optional `search`, `status`, `project_id`, `campaign_id`, `audience_id`, `per_page`, and `page`.
- `POST /api/strategies` — `name`; optional `description`, `objectives`, `success_metrics`, `channels`, decimal `budget`, `starts_on`, `ends_on`, `status`, `progress` (0–100), `action_plan`, `notes`, same-workspace `project_id`/`campaign_id`, and `audience_ids`.
- `GET|PUT|PATCH|DELETE /api/strategies/{strategy}` — retrieve, update, or delete. `audience_ids` on update replaces target audience associations.

An attached campaign must belong to the selected project when both are supplied.

## Market Research — `/api/research`

- `GET /api/research` — optional `search`, `category`, `status`, `from`, `to`, `per_page`, and `page`.
- `POST /api/research` — `name`, `category`; optional `description`, `status`, `starts_on`, `ends_on`, `competitor_profiles`, `opportunities`, `threats`, `findings`, `swot`, `sources`, and `notes`.
- `GET|PUT|PATCH|DELETE /api/research/{research}` — retrieve, update, or delete.

Research profiles and analyses are validated JSON arrays: competitors support name/website/description/strengths/weaknesses; opportunities and threats support title/description; findings support title/insight; SWOT entries support category/item/notes; sources support title/URL/access date. They are stored atomically with their workspace-scoped research project.

## Shared route integration

The dedicated route files install `web`, `auth`, `tenant`, and `tenant.required` themselves. Load these from the shared API route file at top level, without nesting under a second tenant group:

```php
require __DIR__.'/audiences.php';
require __DIR__.'/strategies.php';
require __DIR__.'/research.php';
```
