# Analytics Validation QA

Task: `TASK-0042`  
Scope: analytics event capture, tracking API, admin analytics summaries, segment breakdowns, range filtering, and privacy.

## Safety Boundary

- Execute QA only in the isolated workspace or approved preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not record secrets, tokens, emails, payment details, or private profile data in analytics QA notes.
- Treat analytics endpoints that expose tenant/user data beyond intended aggregates as release blockers.

## Route And Module Coverage

- `app/api/analytics/track/route.ts`
- `app/api/admin/analytics/route.ts`
- `app/api/admin/analytics/breakdown/route.ts`
- `app/admin/analytics/page.tsx`
- `app/admin/analytics/admin-actions/page.tsx`
- `app/admin/analytics/contractors/page.tsx`
- `app/admin/analytics/customers/page.tsx`
- `lib/analytics/events.ts`
- `lib/analytics/track.ts`
- `lib/track.ts`
- `components/analytics/TrackPageView.tsx`

## Event Capture Checklist

- [ ] Login success emits `login` once per successful login action.
- [ ] Signup success emits `signup` once per successful signup action.
- [ ] Mission page open emits `open_mission_page` without blocking page render.
- [ ] Donation checkout start emits `start_donation_checkout` without exposing payment data.
- [ ] Customer job creation success emits `customer_create_job_submitted`.
- [ ] Contractor job detail open emits `job_opened` without leaking unrelated job data.
- [ ] Customer approval request emits `customer_approval_requested`.
- [ ] Bid submission emits `submit_bid` once per successful submit.
- [ ] Contractor onboarding emits started/submitted events consistently.
- [ ] Page view tracking fails soft and does not create user-facing errors.

## Tracking API Checklist

- [ ] Tracking endpoint accepts only known event shapes or safely normalizes unknown optional fields.
- [ ] Tracking endpoint does not require a logged-in user for public events that are intentionally public.
- [ ] Tracking endpoint attaches authenticated role/user context only from trusted session data.
- [ ] Tracking endpoint validates payload size and rejects malformed JSON safely.
- [ ] Tracking endpoint does not log or return raw Supabase errors.
- [ ] Tracking failures do not break primary user workflows.

## Admin Analytics Checklist

- [ ] Analytics overview loads totals for 1 day, 7 days, 30 days, and all time.
- [ ] Range filters return internally consistent totals, by-day rows, top events, role breakdown, and conversions.
- [ ] Onboarding conversion uses submitted divided by started with safe zero handling.
- [ ] Mission checkout conversion uses checkout starts divided by mission opens with safe zero handling.
- [ ] Visibility snapshot identifies top event share, peak activity day, and active roles accurately.
- [ ] Empty event tables render useful empty states rather than errors.
- [ ] Segment pages load customer, contractor, and admin action breakdowns.
- [ ] Non-admin users cannot access admin analytics routes or APIs.

## Data Quality Checks

- [ ] Event names are stable and documented in code or QA notes.
- [ ] Duplicate event emission is checked for forms that can be submitted repeatedly.
- [ ] Timestamps use server-side or database time consistently.
- [ ] Role breakdown uses trusted role context and handles null roles safely.
- [ ] Aggregates do not expose raw emails, names, IDs, tokens, or payment metadata.
- [ ] Analytics failures are logged as operational signals only when they represent real backend failures.

## Verification Commands

Run after analytics changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Analytics validation QA is complete only after event capture, tracking API behavior, admin summaries, segment breakdowns, empty states, range filters, and non-admin denial paths are all verified.
