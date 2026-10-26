# Archive and Meta Ads integration

## Archive API

The module is workspace-scoped and requires the authenticated Laravel session plus `X-Workspace-Id`.

- `GET /api/archive?search=&type=Project|Campaign&status=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=&per_page=` lists records whose persisted project or campaign status is `Archived`.
- `POST /api/archive/{type}/{record}` archives a workspace-owned project or campaign and saves its previous status for restoration.
- `POST /api/archive/{type}/{record}/restore` restores the saved previous status. Records previously marked archived outside this API have no status history and fall back to `Active`.

Reports and file bundles are not shown as archived: those backend records do not currently provide archive/restore support. The additive `archive_entries` table contains workspace-bound restoration history and attribution.

## Meta Ads setup

This module is a server-side OAuth and Marketing API foundation. A real Meta App ID, App Secret, configured OAuth redirect, valid app review/permissions, an HTTPS backend, and Laravel `APP_KEY` are required. No live Meta connection was tested in this worktree.

Configure these variables in the backend environment (never in Vite or frontend code):

- `META_APP_ID`: Meta app ID.
- `META_APP_SECRET`: Meta app secret. Keep this server-only.
- `META_GRAPH_API_VERSION`: a currently supported Graph API version, formatted `vNN.0`.
- `META_OAUTH_REDIRECT_URI`: exact callback URL registered under the Meta app's Valid OAuth Redirect URIs, for example `https://api.example.com/api/integrations/meta/callback`.
- `META_FRONTEND_REDIRECT_URI`: trusted frontend URL to receive connection status, for example `https://app.example.com/integrations/meta`.

In Meta for Developers, enable Facebook Login/OAuth, configure the exact redirect URI, and request the read-only `ads_read` permission. Meta App Review/business verification may be required for production access to accounts not owned by app roles; approval is not implied by this implementation.

OAuth start is an authenticated `POST /api/integrations/meta/connect` with `X-Workspace-Id` and Laravel CSRF protection. It stores a hash of a random one-time state value with the initiating user, workspace, and ten-minute expiry. Meta returns to the public API callback, which atomically consumes and validates that state, rechecks the active workspace membership and write authorization, exchanges the code server-to-server, and redirects to the configured frontend URI with only a non-sensitive result indicator. Access tokens are encrypted using Laravel's `encrypted` cast and `APP_KEY`.

Endpoints:

- `GET /api/integrations/meta/status`
- `POST /api/integrations/meta/connect`
- `GET /api/integrations/meta/callback` (public OAuth callback; valid one-time state required)
- `GET /api/integrations/meta/accounts`
- `GET /api/integrations/meta/insights?account_id=act_123&date_preset=last_30d`
- `DELETE /api/integrations/meta/connection`

Account and insight data are fetched from Meta on request, are not persisted or fabricated, and remain scoped to the active workspace connection. Insights include campaign-level spend, impressions, clicks, reach, CTR and CPC where Meta returns those fields. Expired/revoked credentials are marked expired; missing permissions and rate limits return actionable messages. Requests use bounded timeouts and pagination is restricted to Meta's HTTPS Graph host.

## Integration steps

No shared route/bootstrap file was changed. When integrating this worktree, register `backend/routes/archive.php` and `backend/routes/meta.php` from the central API route file (inside Laravel's API routing context). Add a protected frontend route for `src/features/integrations/meta/MetaAdsIntegrationPage.tsx` at `/integrations/meta`; shared navigation is intentionally unchanged.

Run the additive migrations for `archive_entries` and `meta_ad_connections` through the project's normal reviewed deployment process. They were not run against a database here.