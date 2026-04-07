Frontend Standard

This document defines frontend architecture and implementation rules.

UI/UX decisions are defined in:
ui_design_rules.md

It combines:

UI rules
component rules
page structure
interaction rules
analytics-aware frontend behavior
error handling behavior

It should be used as the default source of truth for frontend work.

IMPORTANT:

This file defines frontend architecture, UI behavior, component patterns, and presentation.
It must not override backend logic, database rules, authentication rules, or business rules.

1. Frontend Philosophy

Frontend must be:

clear
fast
operational
scalable
observable
easy to maintain
easy to instrument

The product is a B2B workflow platform, not a decorative marketing site.

2. Framework Standard

Framework:

Next.js App Router

Structure:

app/
components/
lib/
3. Folder Standard
app/
routes
layouts
page composition
components/
reusable UI blocks
lib/
helpers
analytics
error logging
utilities
4. Route Structure Standard

Public routes:

/
/login
/signup
/forgot-password
/reset-password
/privacy
/terms
/mission

Protected:

/dashboard
/customer
/contractor
/admin
5. Layout Standard
root layout → global config
app layout → dashboard shell
role layouts → role UI
6. Navigation Standard
predictable
consistent
centralized
7. Authentication Frontend Standard
must check session
must redirect properly
must not expose protected UI
8. API Communication Standard
use API routes
avoid direct DB writes
9. UI System Standard
clean enterprise UI
strong hierarchy
no clutter
10. Component Standard

Must use reusable:

buttons
cards
inputs
states
11. Page Pattern Standard

Use structured layouts:

dashboard
list
detail
form
admin
12. Form Standard
structured
resilient
clear feedback
13. Interaction Standard

Every action must have:

loading
success
error
14. Analytics Standard

Use:

lib/track.ts

Rules:

only meaningful events
after success
centralized
15. Error Logging Standard

Use:

lib/logError.ts

Must log:

failed actions
failed loads
admin failures
unexpected errors

Rules:

structured logs
sanitized data
no secrets
non-blocking
16. Error Handling UX Standard

User:

calm message
no technical details

Admin:

full operational visibility

UI must include:

ErrorState component
retry option where appropriate
17. Observability Standard (Critical)

Frontend must be observable.

This means:

every failure is logged
every critical action is trackable
admin can inspect system behavior

No silent failures allowed.

18. Minimal Feature Pattern
render
input
API
success → track
failure → logError
19. Clean Code Standard
no duplication
no scattered logic
no inline hacks
20. Performance Standard
fast
lightweight
minimal blocking
21. Responsiveness Standard
works on all devices
no broken flows
22. Consistency Standard

Same meaning → same UI

23. Admin UX Standard

Admin must:

see errors
understand system state
act on issues

Admin UI = operational control panel

24. Final Rule

Frontend must be:

clean
centralized
observable
instrumented
scalable
production-ready

Default system:

shared UI
shared analytics
shared error logging
API-first behavior

Do not invent new patterns.
Build everything from this system by default.
