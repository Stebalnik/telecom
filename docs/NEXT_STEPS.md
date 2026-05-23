# LEOTEOR Next Steps

## Preview QA

- Smoke test `/`, `/marketplace`, `/marketplace/jobs`,
  `/marketplace/contractors`, `/marketplace/activity`, and `/markets`.
- Confirm public pages do not display emails, phones, private files, internal
  notes, or non-public jobs.
- Test customer signup, fast job creation, template selection, matching preview,
  and contractor invite intent.
- Test contractor signup, onboarding, dashboard profile strength, matching jobs,
  and bid start flow.
- Test admin analytics marketplace acquisition cards after generating sample
  tracking events.

## Data And Security Review

- Confirm Supabase RLS allows only intended public-safe reads for marketplace
  views.
- Confirm public job visibility filters match the production data model.
- Confirm contractor public profiles hide private compliance artifacts.
- Review analytics event payloads for safe metadata only.

## Merge Gate

- Human review is required before merging to `main`.
- Production deployment should happen only after preview QA, build verification,
  and explicit approval.
- Do not enable automated production deployment until a separate deployment
  safety phase defines rollback, monitoring, and approval controls.

## Recommended Next Backlog

- Add durable customer-to-contractor job invitation storage with RLS.
- Add richer job-to-contractor matching using scopes, certifications, insurance,
  and market data.
- Add marketplace SEO metadata per job, contractor, and market page.
- Add admin QA checklist exports for marketplace launch readiness.
