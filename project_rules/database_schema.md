# Database Schema Guidelines

Database: PostgreSQL (Supabase)

---

# Core Entities

users

platform users

contractors

contractor companies

contractor_teams

teams working under contractor

certifications

certificates owned by workers

insurance

contractor insurance policies

jobs

marketplace jobs

job_assignments

which contractor works on which job

documents

uploaded compliance files

---

# Basic Table Structure Example

contractors

id
company_name
tax_id
address
created_at

---

# certifications

id
user_id
certificate_type
expiration_date
document_url

---

# insurance

id
contractor_id
policy_type
policy_number
expiration_date
document_url

---

# jobs

id
title
description
location
customer_id
status
created_at

---

# Relationships

contractor -> teams

contractor -> insurance

user -> certifications

job -> contractor assignments

---

# Naming Rules

Tables

snake_case

Columns

snake_case

Primary key

id

Foreign keys

entity_id

Example

contractor_id
job_id

---

# Data Integrity

Always use:

foreign keys  
indexes  
timestamps

---

# Soft Deletes

Prefer soft deletes when possible

deleted_at column