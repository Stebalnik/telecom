# Admin Workflow QA

Task: `TASK-0038`  
Scope: admin dashboards, approval queues, analytics, feedback, errors, and change-request review workflows.

## Safety Boundary

- Execute QA only in the isolated workspace or preview runtime.
- Do not deploy, merge, restart production services, or touch production files.
- Do not record secrets, private user data, signed URLs, or raw tokens in QA notes.
- Treat non-admin access to admin data as a release blocker.

## Route Coverage

- `/admin`
- `/admin/contractor-approvals`
- `/admin/customer-approvals`
- `/admin/company-change-requests`
- `/admin/company-change-requests/[id]`
- `/admin/team-change-requests`
- `/admin/team-change-requests/[id]`
- `/admin/analytics`
- `/admin/analytics/admin-actions`
- `/admin/analytics/contractors`
- `/admin/analytics/customers`
- `/admin/errors`
- `/admin/feedback`
- `/admin/feedback/[id]`

## Core Workflow Checklist

- [ ] Admin can sign in and land on `/admin` without role confusion.
- [ ] Admin dashboard links reach approvals, analytics, feedback, errors, and change requests.
- [ ] Contractor approval queue shows pending contractors with enough context to approve or return to draft.
- [ ] Contractor approval action confirms success, refreshes count, and prevents duplicate submission.
- [ ] Customer approval queue shows pending customers with enough context to approve or return to draft.
- [ ] Customer approval action confirms success, refreshes count, and prevents duplicate submission.
- [ ] Company change request list separates pending, approved, rejected, or reviewed states when available.
- [ ] Company change request detail shows before/after values and safe decision controls.
- [ ] Team change request list separates pending, approved, rejected, or reviewed states when available.
- [ ] Team change request detail shows affected company/team/member context and safe decision controls.
- [ ] Analytics overview loads total events, funnel data, visibility snapshot, top events, role breakdown, and conversions.
- [ ] Analytics segment pages load admin actions, contractor, and customer breakdowns for each supported range.
- [ ] Errors page shows recent errors without exposing secrets or raw credentials.
- [ ] Feedback center filters feedback by sender type and shows attention state.
- [ ] Feedback detail allows status updates and admin replies with clear busy/error states.

## Security And Permission Checks

- [ ] Customer, contractor, worker, and guest accounts are redirected away from every admin route.
- [ ] Admin APIs verify trusted server-side admin role before returning protected data.
- [ ] Approval actions cannot be performed by non-admin users through direct API calls.
- [ ] Feedback and error records are visible only to admins.
- [ ] Analytics endpoints do not expose private user or company records beyond aggregated/admin-approved fields.
- [ ] Change request decisions are scoped to the exact requested record.

## UX And State Checks

- [ ] Every admin list has empty, loading, success, and error states.
- [ ] Decision buttons communicate saving state and prevent duplicate review actions.
- [ ] Returned-to-draft or rejection flows explain the result clearly.
- [ ] Status badges include readable text and do not rely only on color.
- [ ] Admin tables/cards remain usable at mobile and desktop widths.
- [ ] Admin routes offer a clear path back to the admin dashboard or parent list.
- [ ] Error messages are actionable and do not expose raw backend internals.

## Verification Commands

Run after admin workflow changes:

```bash
npm run agents:verify
npm run agents:self-verify
npm run build
```

## Release Gate

Admin workflow QA is complete only after every admin route and admin API action has been tested with an admin account, a non-admin account, an empty-data state, and a failed-request path.
