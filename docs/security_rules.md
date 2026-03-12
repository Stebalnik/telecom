# Security Rules

Security is critical for Telecom Marketplace.

---

# Secrets

Never commit:

.env  
API keys  
service role keys

---

# Authentication

All protected routes require authentication.

---

# Authorization

Role checks required for:

customer routes  
contractor routes  
admin routes

---

# Supabase RLS

Row Level Security must be enabled.

Users must only access their own data.

---

# File Uploads

Documents such as COI must be stored in secure buckets.

Access should be controlled by signed URLs.

---

# API Protection

Rate limit important endpoints.

Validate all inputs.

Prevent SQL injection.

---

# Logging

Log important actions:

company changes  
insurance approvals  
admin actions