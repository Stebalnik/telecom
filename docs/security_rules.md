# Security Rules

Security is critical for Telecom Marketplace.

System must be designed to prevent:

- unauthorized access  
- data leaks  
- privilege escalation  
- abuse of APIs  
- exposure of sensitive data  

---

# Secrets

Never commit:

- .env  
- API keys  
- service role keys  
- Stripe secrets  
- Supabase service role key  

Rules:

- secrets must exist ONLY on server  
- never expose secrets in frontend bundle  
- never log secrets  
- never send secrets to client  

---

# Authentication

All protected routes require authentication.

Rules:

- validate session on server (API routes)  
- do NOT trust client-only auth state  
- reject requests without valid session  

Applies to:

- /dashboard  
- /customer  
- /contractor  
- /admin  
- all protected API routes  

---

# Authorization

Role checks are mandatory.

Roles:

- customer  
- contractor  
- admin  

Rules:

- validate role on server before action  
- never rely on frontend role  
- enforce role-based access in API routes  

Examples:

- contractor cannot access admin routes  
- customer cannot submit contractor actions  
- only admin can approve data  

---

# Supabase RLS

Row Level Security MUST be enabled.

Rules:

- users can only access their own data  
- access must be scoped by user_id or company_id  
- admin access must be explicitly defined  

Never:

- use open policies  
- allow unrestricted select/update/delete  

---

# API Protection

All endpoints must:

- validate input  
- validate authentication  
- validate authorization  
- return safe errors  

Protection rules:

- prevent SQL injection (no raw unsafe queries)  
- validate all fields (types, required, enums)  
- restrict access by role and ownership  

Optional (when scaling):

- rate limit critical endpoints  
- protect analytics endpoints from spam  
- protect auth endpoints from brute force  

---

# File Uploads

All documents (COI, files, etc.) must be secure.

Rules:

- use signed upload URLs  
- use signed download URLs  
- never expose public buckets for sensitive files  
- validate file type and size  

Access:

- time-limited  
- role-restricted  

---

# Logging Security

Logging must NOT expose sensitive data.

Never log:

- passwords  
- tokens  
- API keys  
- service role keys  
- bank/account numbers  
- full payment details  

Allowed:

- user_id  
- role  
- event/action  
- safe metadata  

---

# Analytics Security

Analytics must be safe.

Rules:

- do NOT store sensitive data in events  
- do NOT include secrets in meta  
- do NOT log personal data unnecessarily  

Allowed:

- event name  
- user_id  
- role  
- path  
- safe meta (e.g. jobId)

Not allowed:

- emails (unless required and justified)  
- payment info  
- private documents  

---

# Error Logging Security

Error logs must be controlled.

Rules:

- store errors in dedicated table  
- sanitize messages before saving  
- avoid raw stack traces in DB (or restrict access)  

Never expose to frontend:

- internal errors  
- database structure  
- stack traces  

---

# Admin Access Protection

Admin routes must be strictly protected.

Rules:

- server-side role validation required  
- no client-only protection  
- all admin APIs must re-check role  

Applies to:

- analytics dashboard  
- error logs  
- approvals  
- financial operations  

---

# Frontend Security Rules

Frontend must:

- never store secrets  
- never trust local role  
- never call privileged APIs directly  
- always go through API routes  

---

# Data Access Principle

Use principle of least privilege.

Rules:

- user sees only what they need  
- contractor sees only their jobs/data  
- customer sees only their jobs/data  
- admin sees controlled global data  

---

# Secure Defaults

All new features must:

- require auth if not public  
- enforce role checks  
- use API routes  
- validate input  
- log important actions  
- avoid exposing sensitive data  

---

# Final Rule

Security is NOT optional.

Every feature must be built with:

- authentication  
- authorization  
- validation  
- logging  
- safe data handling  

If unsure → restrict access, not expand it.
