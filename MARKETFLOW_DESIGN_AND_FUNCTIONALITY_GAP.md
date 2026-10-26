# MarketFlow Design and Functionality Gap Audit

## Purpose and audit limits

This is a read-only, evidence-based snapshot of the current repository. It is
not a claim that the product is complete, that every route works in a deployed
environment, or that existing tests pass. No application code, database,
environment file, or Git history was changed for this audit.

The audit used the Calendar as the detailed example, then inventoried the
other routed React pages and the backend schema, routes, controllers, and
feature-test evidence. Test files were inspected but not run. “API-backed”
means a frontend service calls an API route; it does not prove that the
deployed API is reachable or that its response matches the UI at runtime.
“Feature tests” means Laravel endpoint/workflow tests, not browser end-to-end
tests.

### Reference limitation

No approved page mockup or screenshot could be verified in the repository or
available browser session. The only image found was `src/assets/hero.png`, an
abstract graphic with no identifiable page or UI. The supplied Calendar
reference image was not available for visual inspection in this session. The
Calendar comparison below therefore uses the user-provided description of its
intended professional social-media content-management workflow, plus source
code evidence; it does not assert pixel-level differences. There are no
verified original references against which to compare the other routes.

The protected application opened at Login without an authenticated session,
so it could not be used to inspect protected pages visually.

## Executive summary

| Area | Evidence-backed status |
|---|---|
| Content Calendar | **Partial against the stated product requirement.** It is a tenant-scoped, timezone-aware calendar for generic events linked optionally to projects/tasks. It is not a social-media post planner or publisher. |
| Main project-management, marketing-intelligence, CRM, finance, analytics, archive, and notification APIs | **Implemented at the inspected code/test level.** Relevant schema, tenant-scoped routes, validation/resources, and Laravel feature tests were found. Runtime/deployment behavior was not verified. |
| Sales | **Partial.** Customer/order creation and lifecycle updates exist; general order update/delete and shipment creation were not found in the route inventory. |
| Meta Ads | **Partial / live behavior unverified.** Authenticated connection, account, preferred-account, and insight APIs exist. Tests use mocked HTTP; no live Meta call was verified. |
| Delivery integrations | **Partial.** Tenant-scoped integration and shipment workflow exists, but a production provider adapter was not found. Tests use a fake adapter. |
| Settings/Profile | **Partial / contract discrepancy.** Several settings and profile operations call APIs, while many preferences are browser-persisted. The frontend handles a possible missing `PATCH /api/profile`, but backend inventory reports profile routes; exact method/path parity needs verification. |
| Original visual fidelity | **Unverified for every route.** No approved references could be mapped to routes. A product-wide design comparison requires the reference files or a reachable design library. |
| UI end-to-end coverage | **Not evidenced.** Utility/API-client tests exist; no React component/browser test suite was found in the inspected inventory. Laravel feature tests do not substitute for browser-level workflow tests. |

## A. Content Calendar: detailed design and functionality gap analysis

The reference described by the user is a social-media content-management
calendar. The implementation is a general event calendar. Those are different
product capabilities even though both display dates in a calendar.

### Current implementation evidence

- `src/features/calendar/ContentCalendarPage.tsx` renders Month, Week, and
  List modes; event search; date navigation; selected-day events; event
  details; and create/edit/delete forms.
- The form captures title, description, date, start/end time, IANA timezone,
  optional project, and optional task. It has no platform, campaign, media,
  editorial status, approval, assignee, or publish controls.
- `src/features/calendar/calendarService.ts` reads and writes
  `/api/calendar/events`, paginates the selected date range, and exposes
  create/update/delete operations. It does not expose platform/campaign
  filters.
- `backend/database/migrations/2026_10_17_000003_create_calendar_events_table.php`
  creates `calendar_events` with workspace and creator IDs, optional project
  and task IDs, title, description, start/end timestamps, timezone, and
  timestamps. No post, channel, campaign, media, approval, or publication
  relation/field is present.
- `backend/app/Http/Controllers/Api/CalendarEventController.php`,
  `backend/routes/calendar.php`, the Calendar FormRequests, and
  `CalendarEventResource` implement authenticated, tenant-scoped generic event
  CRUD, time-range/project/task filtering, pagination, timezone offset
  validation, and project/task association checks.
- `backend/tests/Feature/Api/CalendarApiTest.php` covers CRUD, range filtering,
  timezone validation, role restrictions, tenant isolation, and project
  association. It does not test a marketing-post workflow.

### Feature-by-feature assessment

| Requirement | Database/schema | Laravel API | React UI | Tests | Missing / status |
|---|---|---|---|---|---|
| Marketing content posts | **No.** Only `calendar_events`. | **No post endpoints.** | **No.** Creates generic events. | **No post tests.** | A first-class post/content model and lifecycle are missing. |
| Social-media platforms/channels | **No platform/channel field or relation.** | **No platform endpoints or filters.** | **No platform selection or channel-specific content.** | **No.** | Platform identity, per-platform content, and connected-account relation are missing. |
| Campaign association | **No campaign relation.** Optional project/task only. | **No campaign association/filter.** | **No campaign picker/filter.** | **No.** | Add a tenant-validated campaign relation and filtering if campaign-based planning is required. |
| Editorial statuses and approvals | **No status, reviewer, approval record, or transition history.** | **No workflow endpoints.** | **No status/approval controls.** | **No.** | Define status transitions, reviewer permissions, approval/rejection, and audit history. |
| Captions and post descriptions | Generic event `description` exists. | Generic description is validated and returned. | Generic description textarea. | Generic field only. | Caption text is not modeled as platform-specific post content; no per-channel copy or content validation. |
| Media attachments | **No attachment relation/field in Calendar schema.** | **No Calendar media endpoints.** | **No upload or media library UI.** | **No.** | Media storage, asset metadata, post-asset relation, upload authorization, and preview are missing/unverified. |
| Assigned users | `created_by` records event creator only. | Creator is assigned by server; no assignee operation. | No assignment UI. | No assignee tests. | Separate creator from assigned editor/reviewer and enforce workspace membership. |
| Scheduling/publication dates | Generic timezone-aware `starts_at` and `ends_at`. | Validates explicit offsets and stores UTC; filters by range. | Date/time/timezone inputs and date views. | Timezone/range tests exist. | Event time is not a post schedule; there is no `scheduled_at`, published timestamp, publishing state, or delivery result. |
| Content preview and details | Generic event fields and project/task links. | Resource returns those fields/relations. | Generic title/description/time details. | Generic details only. | No rendered social preview, channel formatting, media preview, or publishing status details. |
| Create/edit/delete | Event CRUD schema/API exists. | **Yes**, with workspace checks and write authorization. | **Yes** for generic events. | **Yes** for event CRUD. | Post CRUD is absent; generic event CRUD cannot satisfy content CRUD. |
| Platform/campaign filtering | No relevant columns/relations. | Range, project, task filters only. | Search and date views; no platform/campaign filters. | Range filtering only. | Add content-specific filters after the post domain exists. |
| Month/week/list views | Schema is view-independent. | Range endpoint supports the UI date window. | **Yes.** | No UI-view tests found. | Views operate on generic events and do not make this a content calendar. |

### Calendar conclusion

The existing Calendar is a useful reusable scheduling surface and generic event
API. It should not be presented as an implemented social-media content
calendar. Its current CRUD, tenant isolation, date handling, and view controls
can be reused, but the content domain and publication workflow are missing.
No social publishing capability should be inferred from a calendar entry or
from an existing Meta Ads connection.

## B. Original design versus current implementation

No approved visual reference could be verified for any route. Consequently,
there is **no evidence-backed original-versus-current visual comparison for
any page**, and this audit does not label a page “faithful” or “degraded” based
on appearance alone.

For Calendar, the intended product has been described as a professional
social-media content-management calendar, while the source confirms generic
event scheduling. This establishes a substantial **functional mismatch** but
not a pixel-level design comparison. To complete visual fidelity review, the
approved references must be made accessible and mapped to their routes.

## C. Schema, API, and workflow gaps

### Confirmed Calendar domain gaps

The inspected Calendar schema/API has no evidenced support for:

- Content posts and per-platform/channel content.
- Campaign association.
- Editorial status, review/approval decisions, or transition history.
- Post captions distinct from generic event descriptions.
- Media assets and post-to-asset relations.
- Assigned editor/reviewer.
- Post-specific scheduled/published timestamps and publishing result/error.
- Platform or campaign filtering.
- A preview rendered for the target platform.

These are requirements to model and validate; exact table names and field
design should be agreed before any migration is authored.

### Other module gaps and unverified behavior

- **Sales:** current API covers customer/order creation and order/payment
  lifecycle changes, with shipment updates. General order update/delete and
  shipment creation were not evidenced in registered routes.
- **Delivery:** connection, shipment, dispatch/refresh, and webhook framework
  exist. No concrete production adapter was found; existing provider behavior
  is represented by an interface/registry and a test fake. Production
  fulfillment is therefore unverified.
- **Meta:** connection status, OAuth, account listing, insights, preferred
  account, and disconnect APIs exist. The inspected tests fake Meta HTTP; live
  credentials, provider configuration, and live API behavior were not
  verified. Ads insights must remain identified as Meta-derived and
  unavailable when the connection/data is absent.
- **Notifications:** database-backed inbox, unread count, read state, and
  verified lead/task event generation exist. No scheduler or external-channel
  delivery was evidenced; do not imply an email/push notification system.
- **Settings:** settings API exists for workspace/regional data, but appearance,
  notification, privacy, and other preferences are persisted in browser
  storage. Cross-device/server-backed persistence is not evidenced for those
  preferences.
- **Profile:** profile/avatar/password API operations are reported by the
  backend route inventory. The React profile flow also handles a possible
  unregistered `PATCH /api/profile` response. Verify exact endpoint method,
  route, and request/response contract before treating profile update as
  end-to-end complete.
- **Workspace selection:** current workspace ID is persisted in browser
  storage, while workspace membership and data are backend-managed. Confirm
  this is only a selection preference and that server authorization remains
  the authority on every request.
- **Background automation:** Laravel queue tables/configuration exist, but no
  application job/scheduler implementation was evidenced in the inspected
  backend inventory. No browser-independent FlowBots execution should be
  claimed from queue infrastructure alone.
- **Tests:** Laravel feature tests provide useful route, role, validation,
  workflow, and tenant-isolation evidence. They are not browser E2E coverage.
  The inspected frontend tests are primarily utility/API-client oriented;
  no React component/browser test suite was found.

## D. Frontend components and interactions

The following page inventory reflects the routed UI and data path found in
source. “API-backed” is a source-code classification, not deployment
verification.

| Route / page | Current UI/data path | Key UI gap or verification need |
|---|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | API-backed forms for auth, recovery-code verification, and reset; validation and registration interactions exist. | Verify full email-provider setup and browser journey against API; no browser E2E evidence. |
| `/` Dashboard | API-backed overview/time series plus campaigns/tasks; date-range, refresh, task status, and navigation interactions. | Verify every displayed metric is based on real scoped records and has explicit empty/error states. |
| `/workspaces` | API-backed workspace list/create/update/delete/switch. | Verify active-workspace restoration and stale-data clearing across users/workspaces; do not treat browser storage as authorization. |
| `/projects`, `/projects/:projectId` | API-backed project CRUD/detail and associated tasks. | Verify route-level empty/error/loading states and relation authorization in browser. |
| `/strategies`, `/strategies/:strategyId/swot`, `/strategies/swot` | API-backed strategy CRUD/initiatives and SWOT reads/writes through research APIs. | Verify workflow completeness and page/reference fidelity when designs are supplied. |
| `/market-research` | API-backed research CRUD and study/findings editing. | Verify source provenance for competitor findings; do not present unsourced or fabricated findings as real. |
| `/audiences` | API-backed segment CRUD and campaign association/use flows. | Verify segment criteria and campaign relations against actual API data and workspace scope. |
| `/campaigns`, `/campaigns/:campaignId` | API-backed campaign/project load, create/edit/delete/archive, and detail updates. | Verify campaign metrics are sourced from actual integration/records and that archived states remain consistent. |
| `/calendar` | API-backed generic event calendar; Month/Week/List, search, event detail and event CRUD. | Missing social post, platform, campaign, media, editorial/approval, assignment, publishing, and content-preview workflows (see section A). |
| `/tasks` | API-backed task/project/campaign data; board/table modes, CRUD, status and details. | Verify assignment/transition authorization and board/table parity in browser. |
| `/crm`, `/crm-leads` | API-backed leads, contacts, customers, pipelines, funnel, notes, activities; CRUD, conversion, reorder. | Verify record links and full cross-entity journeys in browser; backend feature tests are not E2E. |
| `/sales/orders` | API-backed customers/orders; creation and order/payment status changes. | Current backend route set is a subset; shipment/order lifecycle UI must clearly reflect unavailable operations. |
| `/finance/budget`, `/budget-expenses` | API-backed budgets, transactions, summary, categories; CRUD for budgets/transactions. | Verify totals, currency/time periods, and empty states against source records. |
| `/finance/profitability`, `/profitability` | API-backed workspace finance summary and budget-versus-actual display. | Confirm calculation semantics and avoid implying external revenue/spend sources not integrated. |
| `/analytics` | API-backed analytics, campaign data, optional Meta status/accounts/insights; date/filter/metric controls, comparisons, export. | Distinguish Meta-derived metrics from MarketFlow records and unavailable integration data; no fabricated fallback values. |
| `/reports` | API-backed saved report list/create/edit/delete/run and CSV export. | Verify generated report provenance, filters, permissions, and export parity. |
| `/comparisons` | API-backed date-range/campaign comparisons and comparison modes. | Verify zero-baseline and missing-data presentation, plus metric provenance. |
| `/archive` | API-backed archive list and restore. | Verify every supported entity/category and restore behavior; not all types necessarily have equivalent operations. |
| `/settings` | Partial: workspace/regional settings use APIs; appearance and other preferences use browser storage. | Decide which preferences must sync across devices and implement/test that contract. |
| `/integrations/meta` | API-backed connection status, connect/disconnect, accounts, insights, preferred account. | Live Meta behavior unverified; distinguish connected, expired/revoked, disconnected, loading, and error states. |
| `/integrations/delivery` | API-backed connection and shipment operations. | Provider execution is not established without a concrete production adapter and deployment credentials. |
| `/settings/profile`, `/profile` | Partial: profile fetch/update, avatar, password API calls; frontend anticipates a possible missing PATCH endpoint. | Reconcile route method/path with backend registration and verify the full update journey. |

## E. Existing backend features to reuse

The following are evidenced and should be extended rather than replaced:

- Workspace membership, tenant context middleware, scoped models/queries, and
  role/module authorization.
- FormRequest validation and JSON API resources for CRUD modules.
- Project, campaign, and task entities and their workspace-validated
  relationships.
- Calendar event date-range/timezone handling and generic scheduling UI.
- CRM contacts, leads, pipelines, customers, activities, notes, and conversion
  workflows.
- Audience/strategy/research records and their association checks.
- Budget/transaction summaries, analytics/comparison services, and saved
  report generation.
- Archive listing/restore, notification inbox/read-state storage, and event
  notification service.
- Meta connection/OAuth/account persistence and preferred-account support,
  subject to live-provider verification.
- Delivery integration abstractions and shipment/webhook framework, subject
  to production adapters.

These reusable pieces do not remove the need for content-specific models,
permissions, audit records, platform adapters, and UI workflows.

## F. Prioritized, dependency-aware restoration plan

This is a proposed sequence, not authorization to implement. Schema changes
must be reviewed and approved before migration execution; no migration was run
for this audit.

| Priority | Phase | Depends on | Scope / exit condition |
|---|---|---|---|
| P0 | Recover and map approved designs | Product/design owner supplies accessible references and identifies route/page mappings. | Establish the source of truth, responsive states, and interactions for every referenced page. Without this, visual restoration cannot be accepted objectively. |
| P1 | Freeze page requirements and provenance | P0; product owner confirms page behaviors and data sources. | For each route, record expected states, actions, authorization, source of every metric, and explicit unavailable-data behavior. Resolve profile endpoint method/path discrepancy and settings persistence expectations. |
| P2 | Define content domain and workflow | P1; reuse workspace, campaign, user, and Meta connection contracts. | Design post/channel/campaign/media/assignee/status/approval/scheduling/publication entities and permission transitions. Review constraints and tenant keys before writing migrations. |
| P3 | Build safe content persistence and APIs | P2; approved schema and storage policy. | Implement tenant-scoped CRUD, media handling, validation, campaign/platform filters, status transitions, auditability, and idempotent scheduling records. Add migrations but do not execute against production without explicit approval and backup. |
| P4 | Implement editorial UI against the approved Calendar reference | P3; reference delivery (P0). | Restore the professional content-planning experience while retaining existing Month/Week/List utility where appropriate. Add platform/campaign filters, content composer, assignment/approval flow, and channel previews. |
| P5 | Add publication adapters only when authorized | P3; provider approval, credentials, platform permission review, and explicit publishing authorization. | Separate scheduling from external publication; use retries/idempotency and persist outcomes. Never launch ads, spend money, or mutate advertising campaigns implicitly. |
| P6 | Close module-specific completeness gaps | P1 and module owner decisions. | Decide Sales order/shipment operations; implement/verify Delivery production adapters; reconcile Profile contract; choose which Settings preferences are server-backed; clearly gate Meta metrics on verified integration. |
| P7 | Verify complete product journeys | P3–P6. | Run focused backend tests, frontend type/lint/build, and browser E2E for high-risk journeys, including tenant switching, content approval, media upload, publishing failure/retry, and data-empty/error states. Test only against an approved non-production database. |
| P8 | Visual acceptance and release readiness | P0–P7. | Compare every referenced page at agreed viewport sizes and verify responsive, loading, empty, error, and permission states against approved designs. Record any intentional deviations. |

### Safety and integration dependencies for content publishing

An editorial calendar can be delivered without publishing automatically. Any
future provider connection or publication feature requires explicit product
approval, platform authorization, secure credential handling, per-workspace
account selection, token-expiry handling, rate-limit/retry behavior, duplicate
prevention, and a visible publication result. A connected Meta Ads account is
not evidence that organic social publishing is available.

## G. Acceptance criteria by page

These criteria define functional acceptance based on current route/module
evidence. Original visual acceptance remains blocked until approved references
are accessible and mapped.

| Page / route | Minimum acceptance criteria |
|---|---|
| Login / Register / Forgot Password / Reset Password | Valid and invalid submissions have clear outcomes; session restoration does not redirect before validation; recovery codes expire, are single-use and rate-limited; unknown-email responses do not enumerate accounts; no tokens/codes appear in UI or logs. Verify browser flow against the exact backend contract. |
| Dashboard `/` | Every displayed number is derived from authenticated current-workspace records or explicitly identified integrations; no sample values appear as live data; date filters, refresh, task actions, empty states, and errors are correct. |
| Workspaces `/workspaces` | Only memberships the user is authorized for are listed; create/update/delete/switch respect role rules; selection restoration never grants access; switching clears prior workspace data and loads only the new workspace. |
| Projects `/projects`, `/projects/:projectId` | List/detail/create/edit/delete operate on persisted tenant records; linked tasks remain in the same workspace; unauthorized records are hidden/denied; loading, empty, validation, and failure states are visible. |
| Strategies `/strategies` | Strategy CRUD and initiative changes persist; audience associations are workspace-validated; role restrictions and empty/error states are covered. |
| SWOT `/strategies/:strategyId/swot`, `/strategies/swot` | SWOT items load and save against the intended strategy/research record; add/edit permissions and tenant isolation are enforced; source/status is clear where findings are data-backed. |
| Market Research `/market-research` | Study and finding CRUD persists; competitor data has traceable source/provenance or is clearly marked user-entered; no fabricated research is shown as verified. |
| Audiences `/audiences` | Segment data persists; campaign associations are tenant-validated; actual filter/segment semantics match the UI and survive reload. |
| Campaigns `/campaigns`, `/campaigns/:campaignId` | CRUD/archive/detail updates persist; associated project/audience links are authorized; performance/budget metrics show source and unavailable state instead of fabricated values. |
| Content Calendar `/calendar` | Existing generic event CRUD and timezone behavior remain intact. A restored social calendar additionally supports platform and campaign association/filtering, caption/media, assigned users, editorial status/approval, scheduling/publication result, platform preview, and Month/Week/List views. Every operation is workspace-authorized and tested. |
| Tasks `/tasks` | Board and table represent the same persisted tasks; create/edit/status/delete and assignment obey role rules; task/project/campaign links are same-workspace; transition notifications are deduplicated and accurate. |
| CRM `/crm`, `/crm-leads` | Lead/contact/customer/pipeline/note/activity operations persist; conversion is atomic; funnel and stage order reflect backend state; records cannot cross workspaces. |
| Sales Orders `/sales/orders` | Customer/order creation and status changes are persisted and idempotent; unsupported order/shipment actions are not implied by UI; payment state is independent and correct; tenant isolation is enforced. |
| Budget and Expenses `/finance/budget`, `/budget-expenses` | Budget/transaction/category CRUD and totals use persisted records; validation, role restrictions, currency, period boundaries, and empty/error states are correct. |
| Profitability `/finance/profitability`, `/profitability` | Budget-versus-actual calculations reconcile with finance records; any unavailable revenue/spend source is explicit; values never imply an unconnected ad account is providing live data. |
| Analytics `/analytics` | Filters and exports use the same scoped dataset; each metric has defined source/period; Meta metrics are included only for a verified connected account and clearly report unavailable/expired states; no mock fallback masquerades as live. |
| Reports `/reports` | Create/edit/run/delete/export operate on saved reports; generated output matches selected filters and source data; report ownership/workspace and CSV contents are verified. |
| Comparisons `/comparisons` | Comparisons use selected periods/campaigns and correct tenant data; zero/missing baselines avoid divide-by-zero or misleading percentages; every metric source is clear. |
| Archive `/archive` | Only eligible records in the active workspace appear; filters and restore actions are authorized; restored record state and links are consistent after reload. |
| Settings `/settings` | Each preference has a defined persistence scope; server-backed settings survive logout/device change; local-only preferences are disclosed and cannot affect another account; save/error states are clear. |
| Meta Ads `/integrations/meta` | Backend is the source of connection/account state after reload; each workspace’s connection/account is isolated; token expiry/revocation prompts safe reconnection; insights are labeled by source; no ad mutation occurs without explicit authorization. |
| Delivery `/integrations/delivery` | UI reports provider availability truthfully; production adapter tests cover authenticated connection, shipment dispatch/status, signed webhook handling, retry/idempotency, and tenant isolation; no fake provider response is presented as a real shipment. |
| Profile `/settings/profile`, `/profile` | Profile/avatar/password operations match the registered API method/path, validate inputs, preserve account data, and return clear errors; workspace/account switching does not show stale profile data. |

## Recommended next action

Provide the approved reference files (including the original Calendar image)
and route mappings, then approve the P0–P2 requirements/schema review. No
implementation or migration should begin from this audit alone.
