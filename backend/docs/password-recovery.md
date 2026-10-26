# Password recovery setup

Password recovery sends a six-digit email code, valid for 10 minutes. Codes are hashed at rest, have at most five verification attempts, and are rate-limited. Successful code verification returns a short-lived recovery token; that token is also stored only as a SHA-256 hash and is consumed with the password reset.

Configure a real transactional provider before using the feature. For Gmail SMTP, use a Google account with 2-Step Verification enabled and create an App Password. Configure these backend environment variables (do not commit credentials):

- `MAIL_MAILER=smtp`
- `MAIL_HOST=smtp.gmail.com`
- `MAIL_PORT=587`
- `MAIL_USERNAME` — the full Gmail address
- `MAIL_PASSWORD` — the Google App Password, never the account password
- `MAIL_FROM_ADDRESS` — the authenticated Gmail address or an authorized sender alias
- `MAIL_FROM_NAME=MarketFlow`

The existing Laravel SMTP transport uses STARTTLS where available. For production, a transactional provider such as Amazon SES, Postmark, Mailgun, or Resend may be configured through the matching Laravel mailer and provider credentials. The application deliberately refuses to send recovery codes through `log`, `array`, or other non-delivery transports. A local SMTP catcher is suitable for development; it does not demonstrate public email delivery.

Endpoints:

- `POST /api/forgot-password` with `{ "email": "..." }` requests a code. Known and unknown valid email addresses receive the same response. Limited to three requests per 15 minutes per client IP.
- `POST /api/verify-recovery-code` with `{ "email": "...", "code": "123456" }` verifies a code and returns `recovery_token`. A code permits five attempts and expires after 10 minutes. This endpoint is also rate-limited.
- `POST /api/reset-password` with `email`, `recovery_token`, `password`, and `password_confirmation` changes the password. The recovery token expires after 10 minutes and is one-use.

No migration is run automatically. The additive `password_recovery_codes` migration must be applied in the target environment before enabling the feature. The existing `password_reset_tokens` table and data are left intact but are no longer used by this flow.
