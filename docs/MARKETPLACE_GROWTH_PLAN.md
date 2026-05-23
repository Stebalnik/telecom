# LEOTEOR Marketplace Growth Plan

LEOTEOR is shifting from a closed operational B2B SaaS portal into an open,
transparent, SEO-friendly telecom marketplace.

The product direction is:

> Operational Trust Infrastructure for Telecom Execution

The marketplace must make safe demand and supply visible before login while the
platform continues to protect sensitive data, compliance artifacts, private
customer details, and contractor records.

## Marketplace Principles

- Public pages may show only safe, public-ready data.
- Customers can publish operational demand without exposing private contacts.
- Contractors can discover jobs and understand requirements before applying.
- Compliance, qualification, approval, and matching remain platform-governed.
- Protected actions require authentication and server-side authorization.
- Public growth should drive customer and contractor acquisition.

## Phase 1 — Marketplace Visibility

- Build a public marketplace landing page at `/`.
- Build a marketplace hub at `/marketplace`.
- Build a public jobs directory and job detail pages.
- Build a public contractor directory and contractor profile pages.
- Build SEO-ready market pages for states and local markets.
- Add live or safely degraded marketplace counters.

## Phase 2 — Open Job + Eligibility Model

- Add a public-ready job visibility model.
- Add public readiness rules for job publication.
- Create reusable contractor eligibility logic.
- Create compliance gap logic for job and contractor fit.

## Phase 3 — Contractor Acquisition Engine

- Add a fast contractor signup path.
- Add progressive contractor onboarding.
- Upgrade the contractor dashboard with matching jobs and profile strength.
- Add job alert preference foundations.

## Phase 4 — Customer Acquisition Engine

- Simplify fast customer job posting.
- Add job templates for common telecom work.
- Show matching preview after job creation.
- Upgrade the customer dashboard with marketplace activity and next actions.

## Phase 5 — Trust + Reputation System

- Compute contractor trust badges.
- Compute contractor profile strength score.
- Add customer trust signals to public-safe jobs.
- Add a public-safe marketplace activity feed.

## Phase 6 — Liquidity Engine

- Add marketplace stats API.
- Show matching jobs for contractors.
- Show matching contractors for customers.
- Add invitation tracking foundation.

## Phase 7 — Analytics + Conversion Tracking

- Track customer acquisition events.
- Track contractor acquisition events.
- Track public marketplace page views.
- Add admin acquisition analytics views.

## Phase 8 — UX + Design Polish

- Polish landing, marketplace, dashboard, onboarding, job, and contractor cards.
- Use LEOTEOR brand colors and a clean operational trust style.
- Keep pages conversion-focused without exposing private data.

## Phase 9 — Production Hardening

- Verify public pages expose no private data.
- Verify protected actions require auth and role checks.
- Verify no service-role credentials are exposed to frontend code.
- Run lint, build, typecheck, db verification, and snapshots where available.
- Keep implementation status and next steps documented.

### Current Hardening Checklist

- Public marketplace routes must keep using public-ready filters and
  public-safe contractor profile fields.
- Authenticated customer, contractor, worker, and admin actions must remain
  behind role checks.
- Analytics metadata must avoid emails, phones, files, internal notes, and
  sensitive compliance evidence.
- Preview QA must pass before any human-approved merge to `main`.
- Production deploy remains manual and outside the autonomous task loop.

## Agent-Readable Priority Backlog

- Public marketplace landing page
- Public marketplace hub
- Public jobs directory
- Public job detail page
- Public contractor directory
- Public contractor profile page
- Public market index
- Public market detail pages
- Marketplace stats API
- Safe marketplace activity feed
- Job visibility model
- Public readiness rules
- Contractor eligibility engine
- Compliance gap engine
- Fast contractor signup
- Progressive contractor onboarding
- Contractor value dashboard
- Job alerts foundation
- Fast customer job posting
- Job templates
- Matching preview after job creation
- Customer dashboard marketplace upgrade
- Contractor trust badges
- Contractor profile strength score
- Customer trust signals
- Matching jobs for contractor
- Matching contractors for customer
- Contractor invite flow
- Marketplace conversion tracking
- Admin marketplace acquisition analytics
- Marketplace UX polish
- Marketplace production hardening docs
