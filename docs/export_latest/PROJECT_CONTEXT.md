# Project Context Snapshot

Generated: Wed Mar 11 22:51:15 CDT 2026

Export folder: docs/export_files/2026-03-11_22-51-15

## 1. Directory tree
```
app
app/(app)
app/admin
app/admin/company-change-requests
app/admin/company-change-requests/[id]
app/api
app/api/auth
app/api/auth/forgot-password
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
app/forgot-password
app/login
app/logout
app/reset-password
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
app/api/auth/.DS_Store
app/api/auth/forgot-password/.DS_Store
app/api/auth/forgot-password/route.ts
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
app/forgot-password/.DS_Store
app/forgot-password/page.tsx
app/globals.css
app/layout.tsx
app/login/page.tsx
app/logout/page.tsx
app/page.tsx
app/reset-password/page.tsx
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
app/api/auth/forgot-password/route.ts
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
app/forgot-password/page.tsx
app/layout.tsx
app/login/page.tsx
app/logout/page.tsx
app/page.tsx
app/reset-password/page.tsx
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
    "start": "next start",
    "docs:update": "bash ./scripts/update_project_docs.sh",
    "ship": "bash ./scripts/ship.sh"
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

## 5. Important config files
```
package.json
tsconfig.json
next.config.ts
.gitignore
```

## 6. AI Context

# AI_CONTEXT.md

This file describes the full context of the project so AI assistants can understand the architecture and help safely modify the codebase.

---

# Project

Telecom Marketplace

A SaaS marketplace connecting telecom customers with verified telecom contractors.

Built by LEOTEOR LLC.

---

# Core Idea

The platform connects two sides:

CUSTOMERS  
Companies that need telecom work done.

CONTRACTORS  
Telecom crews and companies that perform work.

The platform manages:

• contractor verification  
• insurance compliance (COI)  
• certifications  
• job postings  
• contractor approvals  
• project communication

---

# User Roles

There are three roles.

## customer

Can:

• create jobs  
• view contractors  
• approve contractors  
• set insurance requirements  
• manage projects  

Dashboard:

/customer

---

## contractor

Can:

• create company profile  
• upload COI  
• upload certifications  
• manage team members  
• apply for jobs

Dashboard:

/contractor

Important:

Company data becomes **read-only after submission** and changes require admin approval.

---

## admin

Can:

• review contractor verification  
• approve/reject insurance  
• approve/reject certifications  
• manage platform settings  
• review change requests

Dashboard:

/admin

---

# Tech Stack

Frontend  
Next.js (App Router)

Backend  
Next.js API routes

Database  
Supabase (PostgreSQL)

Auth  
Supabase Auth

Storage  
Supabase Storage

Deployment

DigitalOcean Droplet

Process manager  
PM2

Reverse proxy  
NGINX

---

# Git Workflow

Branches

main  
production branch

dev  
general development

customer  
customer features

contractor  
contractor features

admin  
admin features

All production deployments come from **main**.

---

# Deployment

Local development runs on Mac.

Production server runs on DigitalOcean.

Deploy process:

1 push code to github  
2 pull on server  
3 build  
4 restart pm2

---

# Security

Never expose:

SUPABASE_SERVICE_ROLE_KEY  
database credentials  
private tokens

Service role keys must only be used in server code.

---

# Important AI Rules

When generating code:

1 always follow existing project structure
2 never break authentication flow
3 do not remove role checks
4 do not expose secrets
5 respect Supabase row level security
6 do not modify production database structure without migration

---

# Project Status

Current stage

MVP development

Features implemented:

• authentication  
• role routing  
• dashboards  
• contractor onboarding

Next features:

• contractor verification
• insurance validation
• job marketplace
• subscription for contractors

---

# Instructions for AI

When suggesting commands always specify where they should run:

Example:

Terminal (local machine)

Terminal (production server)

Code file location

Example:

app/api/jobs/route.ts
