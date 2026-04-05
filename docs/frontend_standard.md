# Frontend Standard

This document defines frontend architecture and implementation rules.

UI/UX decisions are defined in:
ui_design_rules.md

It combines:

- UI rules
- component rules
- page structure
- interaction rules
- analytics-aware frontend behavior
- error handling behavior

It should be used as the default source of truth for frontend work.

IMPORTANT:

This file defines frontend architecture, UI behavior, component patterns, and presentation.
It must not override backend logic, database rules, authentication rules, or business rules.

---

# 1. Frontend Philosophy

Frontend must be:

- clear
- fast
- operational
- scalable
- easy to maintain
- easy to instrument

The product is a B2B workflow platform, not a decorative marketing site.

The frontend should feel like:

- Stripe
- Linear
- Vercel
- enterprise SaaS dashboards

Avoid:

- noisy UI
- decorative clutter
- inconsistent actions
- hidden important actions
- over-engineered frontend patterns
- duplicated logic

---

# 2. Framework Standard

Framework:

- Next.js App Router

Default structure:

- app/
- components/
- lib/

Use:

- app/ for routes, layouts, pages
- components/ for reusable UI
- lib/ for helpers, shared frontend logic, analytics, errors, utilities

---

# 3. Folder Standard

## app/
Contains:

- route pages
- layouts
- route-level UI composition

## components/
Contains:

- reusable UI blocks
- reusable form sections
- reusable cards
- reusable navigation
- reusable page helpers

Examples:

- Button
- Card
- PageHeader
- StatusBadge
- EmptyState
- LoadingState
- ErrorState

## lib/
Contains:

- frontend helpers
- analytics helpers
- error logging helpers
- route constants
- mapping functions
- formatting helpers

Examples:

- lib/track.ts
- lib/logError.ts
- lib/routes.ts
- lib/dateUtils.ts

---

# 4. Route Structure Standard

Public routes:

- /
- /login
- /signup
- /forgot-password
- /reset-password
- /privacy
- /terms
- /mission

Protected routes:

- /dashboard
- /customer
- /contractor
- /admin

Rules:

- public pages should stay lightweight
- protected pages should be operational and structured
- route purpose should be obvious from the URL

---

# 5. Layout Standard

## Root layout
Responsible for:

- fonts
- global styles
- metadata
- top-level wrappers

## App layout
Responsible for:

- shared dashboard chrome
- navigation
- consistent page shell

## Role layouts
Responsible for:

- role-specific navigation
- sidebar/header
- consistent section framing

Rules:

- do not repeat layout logic in every page
- use layout files for repeated shell structure
- page files should focus on page content

---

# 6. Navigation Standard

Navigation must be:

- predictable
- consistent
- compact
- readable

Rules:

- never hardcode the same route in many places
- use centralized route constants when possible
- active state must be obvious
- destructive actions must not look like navigation

Preferred navigation structure:

- logo / identity
- primary section links
- utility links
- logout

---

# 7. Authentication Frontend Standard

Authentication is handled by Supabase.

Frontend rules:

- protected pages must check session
- do not trust only client role state
- redirect unauthenticated users
- do not expose protected content before auth check resolves

Role redirects after login:

- customer → /customer
- contractor → /contractor
- admin → /admin

---

# 8. API Communication Standard

Frontend should call:

- Next.js API routes

Avoid direct business writes to Supabase unless explicitly intended and safe.

Benefits:

- centralized validation
- better security
- easier debugging
- cleaner frontend code

Frontend should focus on:

- collecting user input
- calling API
- rendering result
- tracking success
- logging failures

---

# 9. UI System Standard

## Brand foundation

Core colors:

- Brand dark navy: #0A2E5C
- Brand primary blue: #1F6FB5
- Brand accent blue: #2EA3FF
- Brand light blue: #8FC8FF
- Neutral background: #F4F8FC
- Surface white: #FFFFFF
- Text primary: #111827
- Text secondary: #4B5563
- Border: #D9E2EC

## Typography

Primary font:

- Geist Sans

Use strong hierarchy:

- page title
- section title
- body text
- helper text
- labels

## Page background

Default page background:

- #F4F8FC

Default content surface:

- white cards with soft borders

---

# 10. Component Standard

Frontend must be assembled from reusable patterns, not ad hoc page styling.

## Required reusable component types

### Buttons
Types:

- Primary
- Accent
- Secondary
- Danger

Rules:

- one primary CTA per section
- same meaning = same visual style
- loading and disabled states required

### Cards
Use for:

- forms
- summaries
- admin blocks
- lists
- dashboard modules

### Status badges
Use for:

- pending
- approved
- rejected
- neutral/info

Rules:

- status must use both text and color

### Inputs
Use:

- labels
- focus states
- inline errors
- proper spacing

### Empty states
Must include:

- message
- optional CTA

### Loading states
Must be intentional:

- skeleton
- placeholder
- loading text

### Error states
Must be calm and readable:

- user-friendly message
- retry or next step where appropriate

---

# 11. Page Pattern Standard

## Dashboard page
Structure:

1. page title
2. short description
3. summary cards
4. main operational blocks

## List page
Structure:

1. page title
2. filters or actions
3. table or list
4. pagination if needed

## Detail page
Structure:

1. back action
2. title + status
3. metadata
4. content sections
5. actions

## Form page
Structure:

1. page title
2. description
3. grouped fields
4. submit actions at bottom

## Admin page
Structure:

1. title
2. explanation
3. summary row
4. review / analytics / actions

---

# 12. Form Standard

Forms are core product UI and must be structured.

Rules:

- group related fields
- keep labels visible
- show field-level errors
- show top-level error when needed
- keep user input on error
- disable submit while saving
- use sections for long forms
- long flows should feel progressive

Avoid:

- clearing form after failure
- mixing unrelated fields
- silent failure
- submit without clear feedback

---

# 13. Interaction Standard

Every important action must produce visible feedback.

Rules:

- click must feel acknowledged
- long action must show loading
- success must show state change, redirect, or confirmation
- error must be visible and calm

Examples:

- submit → loading button
- approve → processing state
- successful save → redirect or success message
- failed action → user-friendly error

Avoid:

- silent actions
- frozen UI
- invisible background processing

---

# 14. Analytics Standard

Analytics is part of default frontend behavior.

Use only shared helper:

- lib/track.ts

Never duplicate raw analytics fetch logic across pages.

## Track only important actions

Examples:

- login
- signup
- contractor_onboarding_started
- contractor_onboarding_submitted
- customer_create_job_submitted
- submit_bid
- open_mission_page
- start_donation_checkout
- admin_contractor_approved

## Placement rules

Track:

- after successful action
- on important page opens when intentional

Do not track:

- every click
- every render
- low-value noise

Dynamic values go into meta, not event name.

Good:

- submit_bid + { jobId }

Bad:

- submit_bid_job_123

---

# 15. Error Logging Standard

Errors must be logged through shared helper:

- lib/logError.ts

Use it for:

- failed submits
- failed loads
- analytics failures
- important admin failures
- API-facing UX failures

Rules:

- logging must not block UI
- show safe message to user
- send structured details to logs
- never log secrets or sensitive data

---

# 16. Minimal Feature Pattern

Every important frontend feature should follow this pattern:

1. render page or component
2. collect input
3. call API
4. if success → update UI + track()
5. if failure → show safe message + logError()

This is the default product pattern.

---

# 17. Clean Code Standard

Avoid:

- duplicated fetch logic
- duplicated analytics logic
- duplicated error logging logic
- giant page files with repeated UI fragments
- repeated route strings everywhere
- ad hoc styles for the same semantic action

Prefer:

- small helper functions
- reusable components
- centralized route helpers
- centralized analytics helper
- centralized error logging helper

---

# 18. Performance Standard

Frontend must remain lightweight.

Avoid:

- heavy client logic where unnecessary
- unnecessary rerenders
- analytics that block user action
- overcomplicated component trees

Prefer:

- simple client state
- route-level composition
- lightweight helpers
- minimal client-only logic where possible

---

# 19. Responsiveness Standard

All pages must work on:

- desktop
- tablet
- mobile

Important rules:

- actions remain visible
- forms stack cleanly
- tables remain readable or transform appropriately
- no broken filters
- no inaccessible critical buttons on mobile

---

# 20. Consistency Standard

UI with the same meaning must look the same across the product.

Examples:

- all Save buttons should look the same
- all Submit buttons should look the same
- all Back buttons should look the same
- all status badges should follow same tone logic
- all page headers should follow the same pattern

Avoid random page-by-page interpretation.

---

# 21. Default Reusable Frontend Building Blocks

Recommended shared components:

- PageHeader
- SectionHeader
- StatCard
- StatusBadge
- EmptyState
- LoadingState
- ErrorState
- FilterButton
- PrimaryButton
- SecondaryButton
- DangerButton
- FormSection
- DetailGrid
- DataCard

Recommended shared helpers:

- track
- logError
- formatDate
- route constants
- API wrapper when useful

---

# 22. Anti-Patterns

Do NOT:

- create multiple primary CTAs in one block
- hide critical actions in low-visibility places
- use raw fetch for analytics everywhere
- show raw backend errors to users
- reset whole forms on failure
- create visually different versions of same action without reason
- overload pages with too many controls
- create giant forms without grouping
- create decorative UI that slows down operations

---

# 23. Product-Specific Frontend Rules

## Contractor flows
- onboarding should feel linear
- required steps must be obvious
- progress should be understandable

## Customer flows
- create job should feel fast
- job flow should prioritize clarity
- customer actions should feel operational, not technical

## Admin flows
- review actions must be obvious
- status must be visible
- high-risk actions must show clear tone
- analytics and errors must be easy to inspect

---

# 24. Final Rule

Frontend must be:

- clean
- centralized
- readable
- instrumented
- scalable
- production-ready

The default standard is:

- shared UI patterns
- shared analytics helper
- shared error logging helper
- API-first frontend behavior
- clear action hierarchy
- calm, enterprise-grade UI

Do not invent a new frontend pattern for each page.
Build from this system by default.
