# Auth And Session QA

Task: `TASK-0039`  
Scope: authentication, session recovery, password flows, dashboard routing, and role-aware redirects.

## Safety Boundary

- Execute QA only in the isolated workspace or preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not record passwords, reset tokens, Supabase JWTs, cookies, service keys, or magic links.
- Treat role leakage, stale-session access, or token exposure as release blockers.

## Route And Module Coverage

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/logout`
- `/dashboard`
- `/customer`
- `/contractor`
- `/worker`
- `/admin`
- `lib/auth.ts`
- `lib/profile.ts`
- `lib/supabaseClient.ts`
- `lib/supabase/browser.ts`
- `lib/supabase/server.ts`

## Core Auth Checklist

- [ ] Guest can reach `/login`, `/signup`, `/forgot-password`, and public pages.
- [ ] Guest is redirected or blocked from customer, contractor, worker, and admin routes.
- [ ] Login validates missing email/password before attempting Supabase auth.
- [ ] Login shows safe error text for invalid credentials.
- [ ] Successful login routes user to the correct role dashboard.
- [ ] Signup validates required fields and does not create ambiguous partial state.
- [ ] Forgot password validates email and reports success without exposing account existence details beyond intended behavior.
- [ ] Reset password handles missing, expired, or invalid recovery session safely.
- [ ] Logout clears session and prevents back-button access to protected data after refresh.
- [ ] `/dashboard` routes customer, contractor, worker, and admin users to the correct area.
- [ ] Expired sessions show a safe message or redirect to `/login`.
- [ ] Refreshing protected pages preserves valid sessions and does not flash unauthorized data.

## Role Routing Matrix

- [ ] Customer account can access customer routes and is redirected away from contractor, worker, and admin routes.
- [ ] Contractor account can access contractor routes and is redirected away from customer, worker, and admin routes.
- [ ] Worker account can access worker routes and is redirected away from customer, contractor, and admin routes.
- [ ] Admin account can access admin routes and is redirected away from role-specific user routes when appropriate.
- [ ] Guest cannot directly call protected API routes without authentication.

## Session Failure Cases

- [ ] Browser session removed while on a protected page.
- [ ] Supabase session refresh fails.
- [ ] Profile lookup returns no profile for an authenticated user.
- [ ] Profile lookup returns a role that does not match the requested route.
- [ ] Network failure during profile/session load.
- [ ] Two tabs are open and one tab logs out.

## Security Review

- [ ] Client code never prints tokens, cookies, passwords, service keys, or reset links.
- [ ] Server-side Supabase clients are used for protected server routes.
- [ ] Client-side role checks are paired with server/API authorization where sensitive data is returned.
- [ ] Password and reset forms do not include secrets in URLs beyond provider-required recovery flows.
- [ ] Error logging excludes credentials, bearer tokens, refresh tokens, and cookie contents.

## UX And Accessibility Checks

- [ ] Auth forms have labels, visible focus states, and usable keyboard order.
- [ ] Loading and submitting states disable duplicate actions.
- [ ] Error and success messages are announced visually near the form.
- [ ] Auth pages fit mobile and desktop widths without clipped buttons or inputs.

## Verification Commands

Run after auth/session changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Auth/session QA is complete only after happy paths, invalid credentials, expired session, logout, role redirects, and direct protected-route access have all been tested without data leakage.
