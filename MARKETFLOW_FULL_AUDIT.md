# MarketFlow Full Application Audit

**Audit date:** 2026-10-19  
**Repository:** `C:\Users\amina\OneDrive\Documents\MarketingFlwo`  
**Audit type:** Read-only application, API, test, and local-browser review

## 1. Executive summary

**Release readiness: NOT READY for real-customer production use.**

MarketFlow has substantial, real application code: a React/TypeScript client, Laravel APIs, database-backed workspace-owned resources, session authentication, and test coverage for many backend workflows. This is not merely a static mock-up. The strongest positive evidence is the Laravel feature suite passing **170 tests / 1,248 assertions** against its configured in-memory SQLite test database, including tenant isolation, CRUD, analytics/report/comparison, auth, Meta guardrails, and delivery adapter tests.

That evidence is not equivalent to a production-ready SaaS verification. The current frontend type check fails, the combined Node test run fails in three test files, there was no authenticated browser journey, no live PostgreSQL verification, no live Meta or carrier sandbox verification, and several user-visible features are incomplete or device-local. In particular, the research document-upload action does not upload a file, workspace membership/admin endpoints are absent, the archive has unsupported tabs, and no FlowBots/background automation implementation was found.

No migration was run, no real database was queried or changed, no account was registered, and no live Meta/carrier API was called. The existing dirty worktree was preserved. This report is the only file created by this audit.

### Short status summary

- **Genuinely implemented, with automated evidence:** workspace-scoped Laravel persistence and API behavior for many core records; session/CSRF client behavior; tested tenant isolation; tested analytics/reports/comparisons; tested Meta OAuth guardrails; tested delivery adapter/webhook behavior.
- **Partially working:** auth/profile, workspaces, dashboard, projects, campaigns, tasks, CRM, finance, analytics, calendar, notifications, Meta, and settings. Their APIs/UI exist, but full-user journeys, production database behavior, or provider/runtime behavior were not verified; some have known limitations below.
- **Broken now:** `npm run build` fails in the Meta integration page because nullable API data is assigned to string-only React state. Three files also fail under `node --test` due unresolved imports.
- **Still UI/demo or incomplete:** research “Upload Document” records a `document://` reference rather than uploading bytes; archive reports/files views and workspace filter are unsupported; settings preferences are partly browser-local; delivery has no verified carrier adapter; FlowBots are not implemented.
- **Must be completed before launch:** restore a clean production build; validate migrations and data access against PostgreSQL; test registration-to-workflow journeys in a real browser; complete workspace administration/authorization; resolve misleading or unsupported UI; deploy and test actual external providers; improve automated UI/API coverage and deployment monitoring.

## 2. Scope, method, and evidence limits

The review covered the frontend pages/services/routes and test files, Laravel routes/controllers/models/migrations/middleware and tests, integration code/docs/configuration, and the locally available browser application. Inspection was read-only except for creating this requested report.

The worktree was already substantially modified before the audit. At inspection time it had numerous pre-existing modified and untracked files, including the protected dirty files `backend/bootstrap/providers.php`, `backend/config/auth.php`, and `backend/database/factories/UserFactory.php`. Those files were not edited. Findings describe the current worktree, not an asserted clean commit or release tag.

Evidence labels in this report:

- **Code inspection:** behavior is present in the inspected implementation; not evidence of a successful deployed runtime.
- **Automated test:** a test executed successfully, in the test environment stated below.
- **Browser observation:** behavior observed in the local browser; no implied authenticated backend success.
- **Not tested:** no claim is made where credentials, a safe test environment, or provider access was unavailable.

The requested evaluation of Ctrl+F5, logout/login, reopening the browser, offline behavior, multi-user concurrency, responsive breakpoints, screen-reader behavior, and actual PostgreSQL persistence was **not** established end to end.

## 3. Verification performed

| Check | Result | What it establishes / does not establish |
|---|---|---|
| `npm run build` | **FAILED** | TypeScript stops at `src/features/integrations/meta/MetaAdsIntegrationPage.tsx:86`: `string \| null` is not assignable to `string`. Vite production bundling did not run. |
| `npm run lint` | **PASSED with 43 warning diagnostics** | Oxlint exited 0; warnings include React state updates in effects, exhaustive-dependency concerns, and other React/logic warnings. Passing lint does not prove behavior. |
| `node --test` | **FAILED: 39 tests, 3 test files failed** | The API-client, calculations, form-validation, route, and other runnable tests passed; the reports utility and two task/workspace suites failed to resolve imports. In particular, task/workspace tests still reference `src/features/tasks/tasksData.ts`; reports utilities use an extensionless TypeScript import that Node cannot resolve in this invocation. |
| `node --test src/features/api/apiClient.test.mjs` | **PASSED: 4/4** | Verifies session/workspace-scoped requests, CSRF, multipart behavior, and validation-error propagation. |
| `backend: php artisan test` | **PASSED: 170 tests, 1,248 assertions, exit 0** | Ran with `APP_ENV=testing`, `DB_CONNECTION=sqlite`, and `DB_DATABASE=:memory:`. This does not validate PostgreSQL, production configuration, browser flows, or an already-deployed database. |
| Local browser: `/login` and `/register` | **PARTIAL observation** | Login and registration form UI rendered. The browser saw 401 resource responses during session verification while unauthenticated. No credentials were supplied, no account was created, no form was submitted, and no authenticated workflow was tested. |
| Live Meta, delivery provider, database, and deployment checks | **NOT TESTED** | No live credentials/API calls, migrations, shipment creation, or production data access were used. |

## 4. Feature-by-feature audit matrix

Statuses describe the feature as a whole, not just the existence of a route. `VERIFIED WORKING` is reserved for the narrow behavior that automated tests actually exercised. An API-backed feature without complete browser/production evidence remains partial.

| Feature | Status | Evidence and limitations |
|---|---|---|
| Login, registration, session restore, logout | **PARTIALLY WORKING** | Frontend auth service calls Laravel login/register/user/logout endpoints and uses session/CSRF credentials (`src/features/auth/services/authService.ts`). The backend auth tests pass. Browser rendered login/register forms but only the unauthenticated session-check path was observed; successful signup, persistence across reload, logout, and reopening were not tested. |
| Password recovery/reset | **PARTIALLY WORKING** | Frontend service and Laravel password-recovery implementation/tests exist (`src/features/auth/services/authService.ts`; `backend/app/Http/Controllers/Api/PasswordRecoveryController.php`; `backend/tests/Feature/Auth/PasswordRecoveryTest.php`). Test coverage passed, but email delivery, expiry behavior under production configuration, and complete browser flow were not tested. |
| Profile and password change | **PARTIALLY WORKING** | Profile service/UI and backend profile tests exist (`src/features/profile/profileService.ts`; `backend/tests/Feature/Api/ProfileAndWorkspaceSettingsApiTest.php`). Avatar handling and actual persistent cross-session behavior were not browser-tested. |
| Workspace selection and tenant isolation | **VERIFIED WORKING (automated test scope)** | Authenticated routes and tenant-context middleware check workspace membership; the global workspace scope fails closed without context. `backend/tests/Feature/TenantIsolationTest.php` and project tests pass. This is strong evidence for tested requests, not a complete adversarial IDOR review of every endpoint. |
| Workspace team, invitations, roles, permissions | **BROKEN / INCOMPLETE** | API route registration includes workspace CRUD but not member, invitation, or audit-log endpoints. Workspace settings controller methods exist but are not routed. No complete role/permission administration surface was evidenced. See `backend/routes/api.php`, `backend/app/Http/Controllers/Api/WorkspaceSettingsController.php`. |
| Dashboard metrics | **PARTIALLY WORKING** | Dashboard calls analytics overview/time-series and workspace-scoped campaign/task services (`src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/dashboardService.ts`). Analytics tests exercise backend aggregates. No authenticated browser data rendering was verified; current build is blocked elsewhere. |
| Global search | **PLACEHOLDER** | Header input stores local query state but has no submit, API call, filtering, or navigation behavior; it is hidden below the `md` breakpoint and lacks an explicit accessible label (`src/components/layout/AppHeader.tsx:18, 60-71`). |
| Projects | **VERIFIED WORKING (automated test scope)** | Workspace-scoped API service and project CRUD/isolation tests exist and passed (`backend/tests/Feature/Api/ProjectApiTest.php`, `backend/tests/Feature/Api/RegisteredCrudRoutesTest.php`). Browser create/edit/delete and persistence across login were not tested. |
| Strategies and SWOT | **PARTIALLY WORKING** | Strategy services/pages are connected to workspace APIs (`src/features/strategies/strategyService.ts`); backend marketing-intelligence tests passed. No browser validation of calculations, inputs, or persisted edits. |
| Market research | **PARTIALLY WORKING; upload is PLACEHOLDER behavior** | Research API/service exists (`src/features/research/researchService.ts`), but “Upload Document” only stores a `document://<filename>` source reference; the selected file is not transmitted. `src/features/research/MarketResearchPage.tsx:554-571`. |
| Audiences | **PARTIALLY WORKING** | Workspace-scoped audience API service and UI are present (`src/features/audiences/audienceService.ts`). No complete browser CRUD/persistence journey was tested. |
| Campaigns | **VERIFIED WORKING (automated test scope)** | Workspace-scoped service/UI and backend campaign tests passed (`backend/tests/Feature/Api/CampaignApiTest.php`). No browser lifecycle, cross-user authorization, or customer-like data journey was executed. |
| Content calendar | **PARTIALLY WORKING** | Calendar CRUD service/page and backend calendar tests exist and passed (`src/features/calendar/calendarService.ts`; `backend/tests/Feature/Api/CalendarApiTest.php`). UI linked-record loading, date/time zone behavior, and browser CRUD are not verified end to end. |
| Tasks | **VERIFIED WORKING (automated API test scope)** | Task service/UI and `TaskApiTest` passed. Existing Node task/workspace test files fail to resolve `tasksData.ts`, so that frontend test set is stale/broken. No browser task-toggle or reload persistence test. |
| Notifications | **PARTIALLY WORKING** | Notification hook fetches workspace notifications, polls every 60 seconds, paginates, and calls read/read-all APIs; panel handles loading/errors and action links (`src/components/notifications/useNotifications.ts`; `NotificationsPanel.tsx`). `NotificationsApiTest` passed. Real-time delivery, cross-session read/unread synchronization, user notification preferences, and offline/reconnect behavior were not browser-tested. |
| CRM leads, contacts, customers, pipeline | **PARTIALLY WORKING** | API-backed services and dedicated CRM feature tests passed. Lead validation accepts a workspace-valid `pipeline_id` and `stage_id` without requiring the stage to belong to that pipeline (`backend/app/Http/Requests/Crm/StoreLeadRequest.php`, `UpdateLeadRequest.php`). This permits inconsistent CRM data. |
| Sales, orders, shipments | **PARTIALLY WORKING** | Sales API and sales tests exist and passed. Routes currently provide customer/order list/create and status/shipment updates, but no customer update/delete or order detail/edit/delete routes. List endpoints return unpaginated tenant records, creating growth/performance risk (`backend/routes/sales.php`; `backend/app/Http/Controllers/Api/Sales/SalesController.php`). Delivery-provider limitations are covered separately below. |
| Finance, budgets, expenses, profitability | **VERIFIED WORKING (automated API/test scope)** | Finance API tests passed; frontend finance services and profitability page call APIs. Utility tests cover arithmetic, but they are not proof that displayed values reconcile against production transactions or persist through a full browser workflow. |
| Analytics and dashboard aggregates | **VERIFIED WORKING (automated test scope)** | `AnalyticsReportsComparisonsApiTest` exercises workspace aggregates and tenant exclusion; those tests passed. Frontend build and authenticated chart rendering remain unverified. |
| Reports and CSV export | **PARTIALLY WORKING** | Backend saved-report CRUD/generation tests passed; active Reports page uses analytics/report APIs. Legacy sample/local-storage report helpers remain and the Node reports utility suite fails to resolve an extensionless import. CSV download content, large exports, and browser error behavior were not tested. |
| Comparisons | **VERIFIED WORKING (automated test scope)** | Backend tests cover zero baselines and reject cross-workspace campaigns; these passed. No browser validation. |
| Archive | **PARTIALLY WORKING** | Backend archive API tests passed and list/restore UI uses the API, but Reports and Files tabs show unsupported/not-available states and workspace filter callback is a no-op (`src/features/archive/ArchivePage.tsx`). |
| Meta Ads OAuth/accounts/insights | **PARTIALLY WORKING; production integration NOT TESTED** | Read-only `ads_read` integration, account selection, insight display, hashed one-time OAuth state, membership recheck, encrypted access token, and expiry handling are implemented and feature tests passed. No live Meta call or dedicated insights endpoint test was performed. There is no refresh-token flow; users must reconnect after expiry. Current TS build error is in `MetaAdsIntegrationPage.tsx:86`. |
| Delivery integrations | **PLACEHOLDER / framework only for real carriers** | Adapter contract and API exist; tests use a fake adapter and verify webhook/idempotency guardrails. The docs state no Moroccan carrier adapter is enabled or verified. No carrier sandbox credentials/specs or live shipment tracking were exercised (`backend/docs/DELIVERY-INTEGRATION.md`). |
| FlowBots / background automations | **NOT IMPLEMENTED** | No FlowBots implementation, queued integration jobs, or scheduled tasks were found. `backend/routes/console.php` only defines the default inspire command. |
| Settings: workspace details | **PARTIALLY WORKING** | Workspace API updates exist, but controller methods for settings are not routed according to the backend route review. |
| Settings: appearance, density, language, security/privacy preferences | **PARTIALLY WORKING** | Theme/density are stored per user in browser `localStorage`; language/reporting period are device-local, and language does not translate the app (`src/features/settings/settingsData.ts:12-38, 77-115`; `SettingsPage.tsx:412`). Appearance context sets root theme/density attributes and follows OS color scheme, but no styles consuming those attributes were found, so dark mode/compact density visual effect is unverified (`src/context/AppearanceContext.tsx:44-60`; `SettingsPage.tsx:791-916`). Telemetry and cross-session filter controls also lack corresponding automatic behavior (`SettingsPage.tsx:1091, 1118`). |
| Responsive layout, accessibility, navigation | **PARTIALLY WORKING (code evidence only)** | Mobile sidebar/overlay, a labeled toggle, notification dialog semantics/focus return, and some ARIA states are present (`src/components/layout/AppHeader.tsx:50-53`; `AppSidebar.tsx:117-138`; notification components). No viewport matrix, keyboard-only, screen-reader, contrast, or automated accessibility run was performed. |
| PostgreSQL persistence and migration readiness | **NOT TESTED** | Laravel migrations and a PostgreSQL driver configuration exist, but the test suite explicitly uses in-memory SQLite. No PostgreSQL server/schema was inspected or migrated. Default connection in `backend/config/database.php` is SQLite unless deployment environment overrides it. |

## 5. Critical bugs and security risks

### Release-blocking / high-priority defects

1. **Frontend release build is currently broken.** `MetaAdsIntegrationPage.tsx:86` assigns `status.preferred_account_id` (`string | null`) to `accountId` state typed as `string`. `npm run build` fails before Vite bundles. This must be resolved before any release candidate.
2. **Research upload claims more than it does.** The UI does not upload a file; it records a fabricated URI-like reference. This is a data-integrity and user-trust issue, not a real stored document.
3. **Workspace administration is incomplete.** Member, invitation, and audit-log endpoints are missing; workspace settings controller methods are unregistered. A SaaS cannot safely onboard/manage multi-user customers without a deliberate administration/authorization design.
4. **Delivery cannot be represented as a functioning carrier integration.** The backend is an adapter framework with fake-adapter tests, not an enabled carrier provider.
5. **Existing frontend test suites are not currently reliable.** `node --test` fails three test files, including two that reference `tasksData.ts` and a reports test that cannot resolve its TypeScript import path.

### Security and data-integrity posture

- **Positive evidence:** session-authenticated API routing, workspace membership validation, fail-closed tenant scope, encrypted Meta token storage, one-time hashed OAuth state with expiry, Meta callback membership recheck, and tenant-isolation tests are present.
- **No cross-tenant bypass was identified in the core routes/models inspected.** This is not a guarantee that every endpoint is safe; there was no exhaustive hostile IDOR/fuzzing review or production penetration test.
- **CRM consistency gap:** a valid stage from a different pipeline in the same workspace can be attached to a lead. This is a data-integrity defect; do not classify it as a demonstrated tenant escape.
- **Authorization completeness remains unknown:** membership checks are tested, but no complete team-role/permission administration API or permission matrix was evidenced.
- **Do not expose tokens/secrets:** no credentials were printed or copied into this report. Meta live-token behavior and production cookie/CORS/HTTPS settings remain unverified.
- **Third-party/provider safety:** no live campaign mutation was attempted. The inspected Meta flow requests read-only `ads_read`; no campaign-write operation was identified in the integration service.

## 6. Missing or incomplete integrations

- **PostgreSQL:** deployment driver exists, but tests do not exercise it. Validate every migration, JSON/date/decimal behavior, constraints/indexes, and connection pooling against the actual supported PostgreSQL version before release.
- **Workspace administration:** no routed member/invitation/audit endpoints; clarify owners/admin/member roles and enforce authorization on every relevant action.
- **Global search:** header input is currently a local-state-only placeholder; it does not query data or navigate to results.
- **Research file storage:** no multipart upload, storage service, size/type validation, malware scanning, or signed download path is evidenced by the frontend upload handler.
- **Carrier delivery:** no production adapter is enabled. Pick a supported provider, implement secret storage/rotation, sandbox integration, retry/idempotency behavior, webhook signature verification, and observability.
- **Meta token lifecycle:** access tokens are encrypted and expiry is recognized, but there is no refresh flow and no demonstrated provider revocation on disconnect; reconnect/revoke UX and support procedures need a product decision.
- **Search:** endpoint/UI behavior was not verified; add direct search contract and tenant-scope tests before claiming it is global and functional.
- **FlowBots:** absent; do not market or expose automations as available functionality.

## 7. Real versus simulated functionality

| Area | Assessment |
|---|---|
| Core records (workspaces, projects, tasks, campaigns, CRM, finance, reports) | Laravel Eloquent-backed API implementations and migrations exist; many behaviors are covered by SQLite-backed automated feature tests. Production PostgreSQL and complete browser persistence remain unverified. |
| Dashboard | Uses analytics/campaign/task APIs in code; no verified authenticated runtime data was observed. |
| Meta Ads | Real integration code exists and is read-only; automated tests use controlled fixtures/fakes. No live OAuth/account/insight request was made. |
| Delivery | Real API/adapter seam and fake-provider tests exist; no carrier provider enabled or verified. |
| Global search | Placeholder input; no API/query/result behavior found. |
| Research file upload | Simulated/metadata-only; bytes are not uploaded. |
| Archive | List/restore have API backing; report/file areas and workspace filter remain unsupported. |
| Settings | Workspace-specific values may use API; theme/density/language/reporting-period settings are browser-local, and actual theme/density styling effect is unverified. |
| FlowBots | No implementation found. |
| Legacy reports/project data | Mock/sample/local-storage utilities coexist with API-backed active screens and can mislead maintainers or tests about the source of truth. |

## 8. Multi-user and workspace-isolation findings

The backend architecture has a meaningful tenant foundation: API routes require authentication, tenant middleware resolves and validates a workspace membership, workspace-owned models use a global scope, and tests cover cross-tenant rejection. This is the best-verified architectural area.

Remaining work before calling multi-tenancy production-ready:

1. Add an endpoint-by-endpoint authorization matrix covering every list, show, create, update, delete, export, restore, integration, webhook, and nested-resource action.
2. Add two-user/two-workspace adversarial tests for guessed IDs, switched workspace headers, stale workspace selection, and concurrent membership revocation.
3. Implement and test member invitations, role assignment, removal, owner transfer, audit logging, and authorization failure states.
4. Verify authentication/session and data persistence with separate browser profiles and PostgreSQL—not only SQLite feature tests.
5. Confirm local-only preferences are intentionally per-device and never presented as account-wide settings.

## 9. Meta Ads and external integrations

### Meta Ads

- The requested OAuth permission is `ads_read`; the inspected API retrieves ad accounts and campaign-level spend/impressions/clicks/reach/CTR/CPC, and no campaign-write path was found.
- OAuth state is random, hashed in storage, short-lived, and consumed once; callback membership is rechecked.
- Access tokens use Laravel encrypted casting. Expired/revoked credentials are reflected in connection status.
- Account pagination is capped at 20 pages and provider requests time out after 15 seconds.
- No token refresh is implemented; reconnection is required. A remote Meta token revoke on disconnect was not evident.
- Integration tests cover state, token non-disclosure/encryption, membership, expiry, and preferred-account validation. There was no dedicated live insights API test and no actual Meta call in this audit.
- Production readiness still requires verified Meta app configuration, callback URL, HTTPS, key management, least-privilege review, app approval, token-expiry/revocation UX, and sandbox/test-account validation.

### Delivery

The contract covers connection tests, shipment creation/tracking, and signed webhooks. Fake-adapter tests cover encrypted credentials, workspace scope, webhook deduplication, COD/status separation, and retry idempotency. The documented absence of an enabled/verified Moroccan carrier means no real fulfillment workflow has been proven.

## 10. Production deployment and background-worker requirements

- **Build gate:** production build must complete; it currently does not.
- **Database:** explicitly choose and provision PostgreSQL in production; run migrations only through a reviewed deployment process with backups and rollback strategy. This audit did not run migrations.
- **Queue/scheduler:** current Meta and delivery provider calls are synchronous. The configured queue driver defaults to database, and Composer's local `dev` script starts `queue:listen`; however, no production supervisor/container worker or scheduled-task deployment manifest was found. There are no application background automation jobs or schedules to operate today.
- **If/when jobs are introduced:** deploy a supervised worker with retry/backoff, failed-job alerting, idempotency, queue-depth monitoring, and graceful release behavior. Add a scheduler process only for actual scheduled work.
- **Secrets and network:** supply APP_KEY, DB credentials, Meta credentials, mail/storage credentials, HTTPS and callback configuration via a managed secret store; never commit secrets. Verify allowed origins, secure session cookies, rate limiting, log redaction, backups, restore drills, and health checks in the target environment.
- **Operations:** add structured request IDs, provider/API failure dashboards, database/queue alerts, retention policy, backup restore tests, and a documented incident/revocation process.

## 11. Prioritized remediation roadmap

Implement in this order; dependencies are explicit.

### P0 — Release gate

1. **Restore frontend type-check/build.** Fix the nullable preferred Meta account assignment and add a regression test for null/no preferred account.  
   **Depends on:** none.  
   **Acceptance:** `npm run build` exits 0 from a clean install; CI runs the same command; null and valid preferred-account cases compile and render safely.

### P1 — Launch blockers

2. **Create a reproducible PostgreSQL CI/integration environment.** Run migrations and API feature tests on the supported PostgreSQL major version; test constraints, tenant queries, JSON/date/numeric handling, and seed/rollback path.  
   **Depends on:** P0 build gate for end-to-end release CI.  
   **Acceptance:** clean database provisioning and all backend tests pass against PostgreSQL; no production user database is used by CI.

3. **Add authenticated browser acceptance tests for critical journeys.** Registration → login/session restore → create workspace → create campaign/task/lead/expense → refresh/reopen → logout → login; assert persisted values and expected authorization failures.  
   **Depends on:** stable API/database test environment and seeded isolated test data.  
   **Acceptance:** deterministic browser suite runs on isolated data; no credentials or real customer records; captures console/network failures; checks empty/error/loading states.

4. **Complete workspace administration and authorization.** Route settings operations; add membership/invitation/role APIs and enforce explicit permissions across tenant resources.  
   **Depends on:** agree product roles and tenant ownership model.  
   **Acceptance:** owner/admin/member matrix is documented and tested for allowed/denied actions, invitation lifecycle, removal, stale sessions, and cross-tenant IDs.

5. **Replace metadata-only research upload with real file storage—or relabel/remove the action.**  
   **Depends on:** storage provider, retention, privacy, and file-policy decision.  
   **Acceptance:** selected bytes upload and persist; MIME/size validation, malware scanning, authorization, signed downloads, deletion/retention, and retry/error states are covered.

6. **Enable and certify a real delivery provider or clearly disable carrier workflows.**  
   **Depends on:** provider selection, account/sandbox access, webhook contract.  
   **Acceptance:** sandbox test covers connection, create shipment, idempotent retry, tracking updates, invalid/duplicate webhook, secrets, and operator-visible failure; no live shipment in CI.

7. **Repair and modernize frontend tests.** Remove obsolete task fixture imports or replace with service mocks; make reports utilities load consistently; add component/service tests for active API-backed screens.  
   **Depends on:** clarify whether legacy local-storage modules remain supported.  
   **Acceptance:** `node --test` exits 0; tests assert current service/API contracts and contain no fabricated-data pass criteria mistaken for live functionality.

8. **Implement or explicitly remove/disable the global-search placeholder.**  
   **Depends on:** product search scope and indexed entities.  
   **Acceptance:** authenticated search is tenant-scoped, handles empty/partial/error states, keyboard navigation, and opens correct entity; cross-workspace search tests reject leakage.

### P2 — Completeness, correctness, and scale

9. **Finish archive product behavior.** Implement or remove unsupported Reports/Files tabs and workspace filter.  
   **Depends on:** product decision on archived entity types and retention.  
   **Acceptance:** every visible tab/filter changes actual API query/results; restore authorization and empty/error cases tested.

10. **Add bounded pagination and CRM relational validation.** Paginate sales customers/orders and validate that lead stage belongs to the selected pipeline.  
    **Depends on:** define API pagination contract and compatible frontend list behavior.  
    **Acceptance:** stable page cursors/limits and sorting; cross-pipeline stage requests return 422; existing records migrate/repair safely.

11. **Define preference persistence and implement it consistently.** Decide which appearance/language/density/privacy settings are user-wide, workspace-wide, or device-local.  
    **Depends on:** product semantics and user/workspace model.  
    **Acceptance:** save/reload behavior matches the label; preferences do not leak between accounts sharing a browser; reset/default states tested.

12. **Instrument external provider lifecycle.** Add explicit Meta reconnection/revocation guidance, insights endpoint tests, and provider failure observability.  
    **Depends on:** Meta app/product policy and credentials in a safe sandbox.  
    **Acceptance:** approved read-only scope confirmed; expiration/revocation/reconnect and account-selection tests pass without campaign mutation.

### P3 — Polish and operations maturity

13. **Run accessibility and responsive acceptance checks.** Keyboard, focus, labels, contrast, zoom, mobile/tablet layouts, and supported browser matrix.  
    **Depends on:** stable pages and design tokens.  
    **Acceptance:** automated accessibility scan plus documented manual keyboard/screen-reader smoke checks with no critical barriers.

14. **Add production operations readiness.** Health/readiness endpoints, monitored backups/restores, structured logs, retention, rate-limit policy, dependency/update process, and incident runbooks.  
    **Depends on:** chosen hosting and managed database/queue/storage providers.  
    **Acceptance:** deployment checklist and recovery drill demonstrate restoration and safe rollback.

15. **Treat FlowBots as a separately scoped product feature.** Do not expose it as available until execution, authorization, scheduling, retries, audit trails, and customer controls exist.  
    **Depends on:** product specification and queue/worker operations design.  
    **Acceptance:** documented automation model, permission boundaries, idempotent jobs, pause/kill controls, observability, and end-to-end tests.

## 12. Recommended development order and top 10 next fixes

1. **P0:** Fix Meta nullable-state TypeScript error and make the build a required CI gate.
2. **P1:** Establish PostgreSQL-backed CI and validate all migrations/schema/query behavior.
3. **P1:** Add isolated authenticated browser workflows covering signup, persistence, workspace switching, and logout/login.
4. **P1:** Implement workspace member/invitation/role administration and enforce authorization consistently.
5. **P1:** Fix or remove the fake research document-upload action.
6. **P1:** Select and certify a real carrier adapter; otherwise disable delivery actions that imply a live provider.
7. **P1:** Repair stale frontend test imports and add tests for current API-backed behavior.
8. **P1:** Verify and complete global search with tenant-isolation tests.
9. **P2:** Implement archive Reports/Files/filter behavior or remove the unsupported controls.
10. **P2:** Add sales pagination and enforce CRM pipeline/stage consistency.

**Recommended gate before onboarding real customers:** P0 complete; P1 items 2–7 complete for the actual production deployment model; workspace isolation and permissions pass PostgreSQL and two-user browser tests; provider features are either sandbox-certified or clearly disabled; no displayed action claims success without persisted, retrievable data.
