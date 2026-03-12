# API Contracts

This document describes expected API structures.

---

# Authentication

Login handled by Supabase.

Session must be validated in API routes.

---

# Example API

Create Job

POST /api/jobs

Body

{
title
description
location
budget
}

Response

{
success: true
job_id
}

---

# Contractor Company

POST /api/contractor/company

Creates contractor company profile.

After submission company becomes locked.

Changes require admin approval.

---

# Insurance Upload

POST /api/contractor/insurance

Uploads COI document.

Admin reviews and approves.

---

# Certification Upload

POST /api/contractor/certifications

Stores contractor certifications.

Admin verification required.

---

# Job Applications

POST /api/jobs/apply

Contractor applies to job.

Customer approves contractor.