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