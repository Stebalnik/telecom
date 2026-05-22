# Auth Diagnosis

Date: 2026-05-22  
Scope: preview auth/signup/login diagnosis for `/var/www/telecom-agent-workspace` on branch `agents/dev-system`.

## Findings

- Login uses `supabase.auth.signInWithPassword` from the browser client and redirects authenticated users to `/dashboard`.
- Signup uses `supabase.auth.signUp` from the browser client.
- `/dashboard` reads the active Supabase session from the same browser client, loads `profiles`, and routes users by role.
- Profile/cabinet creation is role-driven. Signup creates the Supabase auth user; `/dashboard` creates the `profiles` row after the user selects customer, contractor, or specialist.
- The exported schema requires `profiles.role` to be non-null, so a blank profile cannot be safely created at raw signup time without choosing a role.
- The Supabase clients only read `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Preview environments that are configured with the newer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` name can fail before login/signup reaches Supabase.
- Signup confirmation links did not provide `emailRedirectTo`, so Supabase could fall back to the project Site URL and send users away from `preview.leoteor.com`.
- Forgot-password reset links preferred `NEXT_PUBLIC_APP_URL` over the request origin, which can also send preview users to the production domain if the environment is shared.
- No hardcoded `leoteor.com` URL was found in the auth pages themselves.

## Fix Applied

- Browser and server Supabase clients now accept `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` first and fall back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Signup now passes `emailRedirectTo` using the current browser origin plus `/dashboard`.
- Forgot-password reset links now prefer the current request origin/forwarded host before falling back to `NEXT_PUBLIC_APP_URL`.
- Checkout base URL selection was aligned to prefer the request origin, preventing preview-origin flows from being redirected through a configured production app URL.
- Signup error logging no longer includes the submitted email in client log details.

## Supabase Dashboard Follow-Up

Supabase Auth URL settings may still need to allow the preview domain. Add or verify:

- Site URL appropriate for the intended primary environment.
- Redirect URL allow-list entry for `https://preview.leoteor.com/**`.
- Redirect URL allow-list entry for `https://preview.leoteor.com/dashboard`.
- Redirect URL allow-list entry for `https://preview.leoteor.com/reset-password`.

## Runtime Note

During diagnosis, PM2 no longer listed `telecom-preview` and `localhost:3011` refused connections. The code fix was made without restarting PM2 because production PM2 must not be touched and no preview restart was explicitly requested.
