# Stripe Checkout QA

Task: `TASK-0043`  
Scope: Stripe checkout session creation, client redirect behavior, validation, analytics, and safe failure handling.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Use Stripe test mode only unless a human explicitly authorizes live-mode validation.
- Do not deploy, merge, restart production services, or touch production files.
- Do not record secret keys, webhook secrets, card numbers, payment method IDs, checkout session URLs, or customer payment details.
- Treat live-charge risk or exposed Stripe secrets as release blockers.

## Route And Module Coverage

- `app/api/checkout/create/route.ts`
- `app/dashboard/page.tsx`
- `app/mission/page.tsx`
- `lib/analytics/events.ts`
- `lib/adminAnalytics.ts`
- `docs/MARKETPLACE_PRODUCTION_READINESS.md`

## Checkout Creation Checklist

- [ ] Missing `STRIPE_SECRET_KEY` returns a safe non-sensitive configuration error.
- [ ] Invalid JSON request body fails safely.
- [ ] Missing amount returns `400`.
- [ ] Non-numeric amount returns `400`.
- [ ] Zero or negative amount returns `400`.
- [ ] Amount below minimum returns `400`.
- [ ] Valid amount creates a test checkout session.
- [ ] Amount is converted to cents with expected rounding.
- [ ] Checkout mode is `payment`.
- [ ] Currency is `usd`.
- [ ] Product title and purpose are safe strings.
- [ ] Metadata does not include secrets or oversized/private data.

## Redirect And URL Safety

- [ ] `successPath` must be a relative path beginning with `/`.
- [ ] `cancelPath` must be a relative path beginning with `/`.
- [ ] Protocol-relative paths beginning with `//` are rejected to fallback.
- [ ] Base URL comes from configured app URL or safe request origin.
- [ ] Successful response returns only `ok`, checkout URL, and session ID.
- [ ] Client redirects only after a valid checkout URL is returned.
- [ ] Repeated button clicks do not create duplicate visible UI state.

## Client Flow Checklist

- [ ] Dashboard support checkout shows loading state.
- [ ] Dashboard support checkout shows safe failure text.
- [ ] Mission donation checkout shows loading state.
- [ ] Mission donation checkout logs safe error details when checkout cannot start.
- [ ] Cancel redirect returns user to the expected page with `checkout=cancelled`.
- [ ] Success redirect returns user to the expected page with `checkout=success`.
- [ ] Mobile browsers follow checkout redirect without clipped controls or double-submit confusion.

## Analytics And Observability

- [ ] Checkout start emits the intended analytics event only after checkout creation succeeds.
- [ ] Failed checkout attempts are logged through server/client logging helpers without secrets.
- [ ] Admin analytics conversion calculations do not require payment details.
- [ ] Error logs group checkout failures under stable checkout error codes.

## Negative Test Cases

- [ ] Stripe API unavailable or key invalid.
- [ ] Stripe returns session without URL.
- [ ] Malformed `successPath` and `cancelPath`.
- [ ] Large amount outside expected product policy.
- [ ] Email omitted.
- [ ] Email provided with whitespace.
- [ ] Metadata provided as a non-object.

## Verification Commands

Run after Stripe checkout changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Stripe checkout QA is complete only when test-mode session creation, validation failures, redirect safety, client loading/error states, analytics capture, and secret redaction have been verified.
