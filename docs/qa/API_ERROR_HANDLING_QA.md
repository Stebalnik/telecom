# API Error Handling QA

Task: `TASK-0041`  
Scope: API route error responses, logging behavior, validation failures, auth failures, and client-safe messages.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not log or record secrets, bearer tokens, cookies, service keys, payment data, signed URLs, or raw document contents.
- Treat raw backend errors in client responses as release blockers.

## Reference Surfaces

- `docs/error_handling_standard.md`
- `docs/backend_rules.md`
- `docs/security_rules.md`
- `app/api/**/*/route.ts`
- `lib/errors/*`

## API Route Coverage

- [ ] Admin analytics and analytics breakdown routes.
- [ ] Admin contractor/customer approval routes and pending counts.
- [ ] Admin errors and feedback routes.
- [ ] Public analytics tracking route.
- [ ] Auth forgot-password route.
- [ ] Stripe checkout creation route.
- [ ] COI signed upload and signed URL routes.
- [ ] Contractor HR applications, invitations, vacancies, and workers routes.
- [ ] Customer approval request route.
- [ ] Customer resource acknowledge, signed URL, and upload URL routes.
- [ ] Error logging route.
- [ ] Feedback item and message routes.
- [ ] Worker applications, availability, certifications, insurance, invitations, profile, and vacancies routes.

## Response Shape Checklist

- [ ] Success responses are predictable for each route and documented by usage.
- [ ] Validation failures return `400` with safe, actionable messages.
- [ ] Missing authentication returns `401`.
- [ ] Authenticated but unauthorized access returns `403`.
- [ ] Missing records return `404` without leaking whether another tenant owns the record.
- [ ] Method or state conflicts return an appropriate non-2xx response.
- [ ] Unexpected failures return `500` with a generic message.
- [ ] JSON parsing failures are handled without stack traces.
- [ ] Clients never receive raw Supabase, Postgres, Stripe, storage, or stack-trace details.

## Logging Checklist

- [ ] Primary flow failures are logged with route, area, code, and safe context.
- [ ] Secondary UI failures fail soft where appropriate and avoid noisy error logs.
- [ ] Logging failures do not break the original API response.
- [ ] Sensitive request headers, cookies, tokens, passwords, payment details, signed URLs, and file contents are not logged.
- [ ] Error codes are stable enough for grouping and dashboard review.
- [ ] Expected validation failures are not logged as operational incidents unless they indicate abuse or corruption.

## Negative Test Cases

- [ ] Missing auth session.
- [ ] Wrong role for route.
- [ ] Valid role but wrong owner/tenant ID.
- [ ] Missing required request field.
- [ ] Invalid enum/status value.
- [ ] Invalid UUID or route parameter.
- [ ] Invalid JSON request body.
- [ ] Supabase read failure.
- [ ] Supabase write failure.
- [ ] Storage signed URL failure.
- [ ] Stripe checkout creation failure.

## Client Behavior Checks

- [ ] Calling pages show calm user-facing errors for failed primary API requests.
- [ ] Forms preserve input after recoverable validation failures.
- [ ] Buttons are disabled or show busy state during API submission.
- [ ] Empty states are not treated as errors.
- [ ] Unauthorized responses redirect or explain the session problem safely.

## Verification Commands

Run after API error handling changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

API error handling QA is complete only when all route families have been tested for success, validation failure, authentication failure, authorization failure, and unexpected backend failure behavior without exposing raw internals.
