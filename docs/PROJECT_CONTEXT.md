# Project Context Snapshot

Generated: Wed Mar 11 10:46:38 CDT 2026

## 1. Directory tree
```
app
app/(app)
app/admin
app/admin/company-change-requests
app/admin/company-change-requests/[id]
app/api
app/api/coi
app/api/coi/signed-upload
app/api/coi/signed-url
app/contractor
app/contractor/coi
app/contractor/customers
app/contractor/jobs
app/contractor/jobs/[id]
app/contractor/onboarding
app/contractor/onboarding/company
app/contractor/settings
app/contractor/settings/company
app/customer
app/customer/contractors
app/customer/contractors/approved
app/customer/jobs
app/customer/jobs/active
app/customer/jobs/archive
app/customer/jobs/new
app/customer/settings
app/customer/settings/certs-per-scope
app/customer/settings/insurance
app/dashboard
app/login
app/logout
app/signup
lib
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
app/admin/company-change-requests/.DS_Store
app/admin/company-change-requests/[id]/page.tsx
app/admin/company-change-requests/page.tsx
app/admin/page.tsx
app/api/.DS_Store
app/api/coi/.DS_Store
app/api/coi/signed-upload/route.ts
app/api/coi/signed-url/route.ts
app/contractor/.DS_Store
app/contractor/coi/page.tsx
app/contractor/customers/page.tsx
app/contractor/jobs/[id]/page.tsx
app/contractor/jobs/page.tsx
app/contractor/onboarding/.DS_Store
app/contractor/onboarding/company/page.tsx
app/contractor/page.tsx
app/contractor/settings/.DS_Store
app/contractor/settings/company/page.tsx
app/customer/.DS_Store
app/customer/contractors/.DS_Store
app/customer/contractors/approved/page.tsx
app/customer/contractors/layout.tsx
app/customer/contractors/page.tsx
app/customer/jobs/.DS_Store
app/customer/jobs/active/page.tsx
app/customer/jobs/archive/page.tsx
app/customer/jobs/layout.tsx
app/customer/jobs/new/page.tsx
app/customer/jobs/page.tsx
app/customer/page.tsx
app/customer/settings/.DS_Store
app/customer/settings/certs-per-scope/page.tsx
app/customer/settings/insurance/page.tsx
app/customer/settings/page.tsx
app/dashboard/page.tsx
app/favicon.ico
app/globals.css
app/layout.tsx
app/login/page.tsx
app/logout/page.tsx
app/page.tsx
app/signup/page.tsx
lib/.DS_Store
lib/adminDocs.ts
lib/bids.ts
lib/coi.ts
lib/coiDownload.ts
lib/contractor.ts
lib/customer_old.ts
lib/customers.ts
lib/dateUtils.ts
lib/documents.ts
lib/eligibility.ts
lib/jobFiles.ts
lib/jobs.ts
lib/profile.ts
lib/supabase/server.ts
lib/supabaseClient.ts
public/.DS_Store
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
app/admin/company-change-requests/[id]/page.tsx
app/admin/company-change-requests/page.tsx
app/admin/page.tsx
app/api/coi/signed-upload/route.ts
app/api/coi/signed-url/route.ts
app/contractor/coi/page.tsx
app/contractor/customers/page.tsx
app/contractor/jobs/[id]/page.tsx
app/contractor/jobs/page.tsx
app/contractor/onboarding/company/page.tsx
app/contractor/page.tsx
app/contractor/settings/company/page.tsx
app/customer/contractors/approved/page.tsx
app/customer/contractors/layout.tsx
app/customer/contractors/page.tsx
app/customer/jobs/active/page.tsx
app/customer/jobs/archive/page.tsx
app/customer/jobs/layout.tsx
app/customer/jobs/new/page.tsx
app/customer/jobs/page.tsx
app/customer/page.tsx
app/customer/settings/certs-per-scope/page.tsx
app/customer/settings/insurance/page.tsx
app/customer/settings/page.tsx
app/dashboard/page.tsx
app/layout.tsx
app/login/page.tsx
app/logout/page.tsx
app/page.tsx
app/signup/page.tsx
```

## 4. Package.json
```json
{
  "name": "telecom",
  "version": "0.1.0",
  "private": true,
  "scripts": {"dev": "next dev --webpack",
    "dev:turbo": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@supabase/realtime-js": "^2.97.0",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.97.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
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

