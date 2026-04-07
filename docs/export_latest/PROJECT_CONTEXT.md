# Project Context Snapshot

Generated: Tue Apr  7 19:19:02 EDT 2026

Export folder: docs/export_files/2026-04-07_19-19-02

## 1. Directory tree
```
app
app/(app)
app/admin
app/admin/analytics
app/admin/analytics/admin-actions
app/admin/analytics/contractors
app/admin/analytics/customers
app/admin/company-change-requests
app/admin/company-change-requests/[id]
app/admin/contractor-approvals
app/admin/customer-approvals
app/admin/errors
app/admin/feedback
app/admin/feedback/[id]
app/admin/team-change-requests
app/admin/team-change-requests/[id]
app/api
app/api/admin
app/api/admin/analytics
app/api/admin/analytics/breakdown
app/api/admin/contractor-approvals
app/api/admin/contractor-approvals/pending-count
app/api/admin/customer-approvals
app/api/admin/customer-approvals/[id]
app/api/admin/customer-approvals/[id]/approve
app/api/admin/customer-approvals/[id]/return-to-draft
app/api/admin/customer-approvals/pending-count
app/api/admin/errors
app/api/admin/feedback
app/api/admin/feedback/[id]
app/api/admin/feedback/[id]/messages
app/api/analytics
app/api/analytics/track
app/api/auth
app/api/auth/forgot-password
app/api/checkout
app/api/checkout/create
app/api/coi
app/api/coi/signed-upload
app/api/coi/signed-url
app/api/customer
app/api/customer-approvals
app/api/customer-approvals/request
app/api/customer/resources
app/api/customer/resources/acknowledge
app/api/errors
app/api/errors/log
app/api/feedback
app/api/feedback/[id]
app/api/feedback/[id]/messages
app/contractor
app/contractor-agreement
app/contractor/agreements
app/contractor/bids
app/contractor/certifications
app/contractor/coi
app/contractor/company
app/contractor/company/change-request
app/contractor/company/change-request 2
app/contractor/customers
app/contractor/customers/[customerId]
app/contractor/customers/[customerId]/resources
app/contractor/insurance
app/contractor/jobs
app/contractor/jobs/[id]
app/contractor/onboarding
app/contractor/onboarding/company
app/contractor/requests
app/contractor/resources
app/contractor/settings
app/contractor/settings/company
app/contractor/teams
app/contractor/teams/change-request
app/contractor/teams/new
app/contractor/teams/requests
app/customer
app/customer-agreement
app/customer/agreements
app/customer/bids
app/customer/bids/[jobId]
app/customer/compliance
app/customer/contractors
app/customer/contractors/all
app/customer/contractors/approved
app/customer/jobs
app/customer/jobs/active
app/customer/jobs/archive
app/customer/jobs/new
app/customer/requests
app/customer/resources
app/customer/resources/[id]
app/customer/resources/[id]/edit
app/customer/resources/file-url
app/customer/resources/new
app/customer/resources/upload-url
app/customer/settings
app/customer/settings/certs-per-scope
app/customer/settings/insurance
app/dashboard
app/feedback
app/forgot-password
app/login
app/logout
app/mission
app/privacy
app/reset-password
app/signup
app/terms
components
components/analytics
lib
lib/admin
lib/analytics
lib/errors
lib/server
lib/supabase
public
supabase
supabase/.temp
```

## 2. File list
```
app/.DS_Store
app/(app)/layout.tsx
app/admin/.DS_Store
app/admin/analytics/.DS_Store
app/admin/analytics/admin-actions/page.tsx
app/admin/analytics/contractors/page.tsx
app/admin/analytics/customers/page.tsx
app/admin/analytics/page.tsx
app/admin/company-change-requests/[id]/page.tsx
app/admin/company-change-requests/page.tsx
app/admin/contractor-approvals/page.tsx
app/admin/customer-approvals/page.tsx
app/admin/errors/page.tsx
app/admin/feedback/[id]/page.tsx
app/admin/feedback/page.tsx
app/admin/layout.tsx
app/admin/page.tsx
app/admin/team-change-requests/[id]/page.tsx
app/admin/team-change-requests/page.tsx
app/api/.DS_Store
app/api/admin/.DS_Store
app/api/admin/analytics/.DS_Store
app/api/admin/analytics/breakdown/route.ts
app/api/admin/analytics/route.ts
app/api/admin/contractor-approvals/.DS_Store
app/api/admin/contractor-approvals/pending-count/route.ts
app/api/admin/customer-approvals/.DS_Store
app/api/admin/customer-approvals/[id]/approve/route.ts
app/api/admin/customer-approvals/[id]/return-to-draft/route.ts
app/api/admin/customer-approvals/pending-count/route.ts
app/api/admin/customer-approvals/route.ts
app/api/admin/errors/route.ts
app/api/admin/feedback/.DS_Store
app/api/admin/feedback/[id]/.DS_Store
app/api/admin/feedback/[id]/messages/route.ts
app/api/admin/feedback/[id]/route.ts
app/api/admin/feedback/route.ts
app/api/analytics/.DS_Store
app/api/analytics/track/route.ts
app/api/auth/forgot-password/route.ts
app/api/checkout/create/route.ts
app/api/coi/signed-upload/route.ts
app/api/coi/signed-url/route.ts
app/api/customer-approvals/request/route.ts
app/api/customer/resources/acknowledge/route.ts
app/api/errors/.DS_Store
app/api/errors/log/route.ts
app/api/feedback/[id]/messages/route.ts
app/api/feedback/[id]/route.ts
app/api/feedback/route.ts
app/contractor-agreement/page.tsx
app/contractor/agreements/page.tsx
app/contractor/bids/page.tsx
app/contractor/certifications/page.tsx
app/contractor/coi/page.tsx
app/contractor/company/change-request/page.tsx
app/contractor/company/page.tsx
app/contractor/customers/[customerId]/resources/page.tsx
app/contractor/customers/page.tsx
app/contractor/insurance/page.tsx
app/contractor/jobs/[id]/page.tsx
app/contractor/jobs/page.tsx
app/contractor/layout.tsx
app/contractor/onboarding/company/page.tsx
app/contractor/page.tsx
app/contractor/requests/page.tsx
app/contractor/resources/page.tsx
app/contractor/settings/company/page.tsx
app/contractor/teams/change-request/page.tsx
app/contractor/teams/new/page.tsx
app/contractor/teams/page.tsx
app/contractor/teams/requests/page.tsx
app/customer-agreement/page.tsx
app/customer/agreements/page.tsx
app/customer/bids/[jobId]/page.tsx
app/customer/bids/page.tsx
app/customer/compliance/page.tsx
app/customer/contractors/all/page.tsx
app/customer/contractors/approved/page.tsx
app/customer/contractors/layout.tsx
app/customer/contractors/page.tsx
app/customer/jobs/active/page.tsx
app/customer/jobs/archive/page.tsx
app/customer/jobs/layout.tsx
app/customer/jobs/new/page.tsx
app/customer/jobs/page.tsx
app/customer/layout.tsx
app/customer/page.tsx
app/customer/requests/page.tsx
app/customer/resources/[id]/edit/page.tsx
app/customer/resources/[id]/page.tsx
app/customer/resources/file-url/route.ts
app/customer/resources/new/page.tsx
app/customer/resources/page.tsx
app/customer/resources/upload-url/route.ts
app/customer/settings/certs-per-scope/page.tsx
app/customer/settings/insurance/page.tsx
app/customer/settings/page.tsx
app/dashboard/page.tsx
app/favicon.ico
app/feedback/page.tsx
app/forgot-password/page.tsx
app/globals.css
app/layout.tsx
app/login/page.tsx
app/logout/page.tsx
app/mission/page.tsx
app/page.tsx
app/privacy/page.tsx
app/reset-password/page.tsx
app/signup/page.tsx
app/terms/page.tsx
components/.DS_Store
components/AdminSidebar.tsx
components/analytics/TrackPageView.tsx
components/AppChrome.tsx
components/ContractorSidebar.tsx
components/CustomerSidebar.tsx
components/LegalPage.tsx
components/LogoutButton.tsx
lib/.DS_Store
lib/admin/refreshAdminSidebar.ts
lib/adminAnalytics.ts
lib/adminDocs.ts
lib/agreements.ts
lib/analytics/events.ts
lib/analytics/track.ts
lib/auth.ts
lib/bids.ts
lib/coi.ts
lib/coiDownload.ts
lib/contractor.ts
lib/contractorMarketplace.ts
lib/customerDashboard.ts
lib/customers.ts
lib/dateUtils.ts
lib/documents.ts
lib/eligibility.ts
lib/errors/normalizeError.ts
lib/errors/unwrapSupabase.ts
lib/errors/withErrorLogging.ts
lib/errors/withServerErrorLogging.ts
lib/jobFiles.ts
lib/jobs.ts
lib/logError.ts
lib/profile.ts
lib/server/logServerError.ts
lib/supabase/browser.ts
lib/supabase/server.ts
lib/supabaseClient.ts
lib/track.ts
public/file.svg
public/globe.svg
public/logo.png
public/next.svg
public/vercel.svg
public/window.svg
supabase/.temp/cli-latest
supabase/.temp/gotrue-version
supabase/.temp/pooler-url
supabase/.temp/postgres-version
supabase/.temp/project-ref
supabase/.temp/rest-version
supabase/.temp/storage-migration
supabase/.temp/storage-version
```

## 3. Routes
```
app/(app)/layout.tsx
app/admin/analytics/admin-actions/page.tsx
app/admin/analytics/contractors/page.tsx
app/admin/analytics/customers/page.tsx
app/admin/analytics/page.tsx
app/admin/company-change-requests/[id]/page.tsx
app/admin/company-change-requests/page.tsx
app/admin/contractor-approvals/page.tsx
app/admin/customer-approvals/page.tsx
app/admin/errors/page.tsx
app/admin/feedback/[id]/page.tsx
app/admin/feedback/page.tsx
app/admin/layout.tsx
app/admin/page.tsx
app/admin/team-change-requests/[id]/page.tsx
app/admin/team-change-requests/page.tsx
app/api/admin/analytics/breakdown/route.ts
app/api/admin/analytics/route.ts
app/api/admin/contractor-approvals/pending-count/route.ts
app/api/admin/customer-approvals/[id]/approve/route.ts
app/api/admin/customer-approvals/[id]/return-to-draft/route.ts
app/api/admin/customer-approvals/pending-count/route.ts
app/api/admin/customer-approvals/route.ts
app/api/admin/errors/route.ts
app/api/admin/feedback/[id]/messages/route.ts
app/api/admin/feedback/[id]/route.ts
app/api/admin/feedback/route.ts
app/api/analytics/track/route.ts
app/api/auth/forgot-password/route.ts
app/api/checkout/create/route.ts
app/api/coi/signed-upload/route.ts
app/api/coi/signed-url/route.ts
app/api/customer-approvals/request/route.ts
app/api/customer/resources/acknowledge/route.ts
app/api/errors/log/route.ts
app/api/feedback/[id]/messages/route.ts
app/api/feedback/[id]/route.ts
app/api/feedback/route.ts
app/contractor-agreement/page.tsx
app/contractor/agreements/page.tsx
app/contractor/bids/page.tsx
app/contractor/certifications/page.tsx
app/contractor/coi/page.tsx
app/contractor/company/change-request/page.tsx
app/contractor/company/page.tsx
app/contractor/customers/[customerId]/resources/page.tsx
app/contractor/customers/page.tsx
app/contractor/insurance/page.tsx
app/contractor/jobs/[id]/page.tsx
app/contractor/jobs/page.tsx
app/contractor/layout.tsx
app/contractor/onboarding/company/page.tsx
app/contractor/page.tsx
app/contractor/requests/page.tsx
app/contractor/resources/page.tsx
app/contractor/settings/company/page.tsx
app/contractor/teams/change-request/page.tsx
app/contractor/teams/new/page.tsx
app/contractor/teams/page.tsx
app/contractor/teams/requests/page.tsx
app/customer-agreement/page.tsx
app/customer/agreements/page.tsx
app/customer/bids/[jobId]/page.tsx
app/customer/bids/page.tsx
app/customer/compliance/page.tsx
app/customer/contractors/all/page.tsx
app/customer/contractors/approved/page.tsx
app/customer/contractors/layout.tsx
app/customer/contractors/page.tsx
app/customer/jobs/active/page.tsx
app/customer/jobs/archive/page.tsx
app/customer/jobs/layout.tsx
app/customer/jobs/new/page.tsx
app/customer/jobs/page.tsx
app/customer/layout.tsx
app/customer/page.tsx
app/customer/requests/page.tsx
app/customer/resources/[id]/edit/page.tsx
app/customer/resources/[id]/page.tsx
app/customer/resources/file-url/route.ts
app/customer/resources/new/page.tsx
app/customer/resources/page.tsx
app/customer/resources/upload-url/route.ts
app/customer/settings/certs-per-scope/page.tsx
app/customer/settings/insurance/page.tsx
app/customer/settings/page.tsx
app/dashboard/page.tsx
app/feedback/page.tsx
app/forgot-password/page.tsx
app/layout.tsx
app/login/page.tsx
app/logout/page.tsx
app/mission/page.tsx
app/page.tsx
app/privacy/page.tsx
app/reset-password/page.tsx
app/signup/page.tsx
app/terms/page.tsx
```

## 4. Package.json
```json
{
  "name": "telecom",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --webpack",
    "dev:turbo": "next dev",
    "build": "next build",
    "start": "next start",
    "docs:update": "bash ./scripts/update_project_docs.sh",
    "ship": "bash ./scripts/ship.sh",
    "release:auto": "bash ./scripts/release_auto.sh"
  },
  "dependencies": {
    "@next/third-parties": "^16.2.2",
    "@supabase/realtime-js": "^2.97.0",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.97.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "stripe": "^22.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

## 5. Important config files
```
package.json
package-lock.json
tsconfig.json
next.config.ts
.gitignore
```

