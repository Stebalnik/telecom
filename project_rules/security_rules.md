
---

## `docs/security_rules.md`

```md
# Security Rules

This file defines secure coding rules for this project.

IMPORTANT:
These rules apply to all backend code, auth flows, file uploads, database access, admin logic, and any code that handles user or company data.

These rules do NOT freeze architecture.
They define security expectations only.

---

# Core Principle

Never trust the client.

All input, permissions, roles, and file uploads must be validated on the server side.

A working feature is not complete unless it is also reasonably secure.

---

# Authentication

All protected routes and actions must verify authentication.

Never assume that because a button is hidden in the UI, the route is protected.

Server-side code must explicitly check the current user/session before returning protected data or performing protected actions.

Examples of protected data:
- contractor company details
- insurance records
- certification documents
- internal billing data
- team member records
- job assignments
- admin screens
- approval workflows

---

# Authorization

Authentication is not enough.

Every protected action must also verify authorization.

Questions to check:
- Is this user allowed to access this exact resource?
- Is this user allowed to modify this exact resource?
- Is this user acting within their role?

Examples:
- A contractor must not edit another contractor's company profile
- A customer must not view private billing info unless allowed
- A non-admin user must not approve contractors
- Users must not access files only because they guessed a URL or ID

---

# Role and Permission Checks

Never rely only on client-provided role values.

Role checks must be done using trusted server-side data.

Common role examples:
- admin
- customer
- contractor
- crew_member

Always check both:
- authenticated identity
- server-side role/ownership relationship

---

# Ownership Checks

When reading or updating a record, confirm resource ownership or explicit permission.

Examples:
- contractor can access only records tied to their company
- customer can access only records tied to their company or approved relationships
- crew member can access only resources explicitly allowed to them

Do not expose records just because the user is logged in.

---

# Input Validation

All inputs must be validated server-side.

Validate:
- required fields
- types
- string lengths
- numeric ranges
- enums/status values
- dates
- IDs
- file metadata
- URLs if accepted
- search/sort params
- pagination params

Never assume client validation is enough.

---

# Safe Defaults

When unsure, deny access by default.

Preferred behavior:
- reject unknown role
- reject malformed input
- reject unsupported file type
- reject missing ownership proof
- reject unknown status transition

Do not create permissive fallbacks that expose data.

---

# Sensitive Data Handling

Do not expose sensitive information in API responses, logs, or UI unless explicitly needed.

Examples of sensitive or restricted data:
- access tokens
- service role keys
- raw auth session internals
- tax IDs
- bank/account details
- private insurance policy details beyond what the user should see
- internal notes
- internal IDs used only for implementation
- signed URLs that are broader than necessary

Only return the minimum required data.

---

# Secrets Management

Never hardcode secrets in code.

Never expose secrets in:
- frontend bundles
- client-side environment variables
- logs
- API responses
- error messages
- repository files

Secrets must stay server-side.

Examples:
- Supabase service role key
- payment secrets
- webhook secrets
- API keys
- private signing keys

---

# Database Access Rules

Use least privilege where possible.

Do not query more fields than needed.

Do not return all columns by default if only a few are needed.

Prefer explicit selects over broad selects where practical.

Always design database operations with the expectation that clients may be malicious.

---

# SQL Safety

Never build SQL queries through unsafe string concatenation.

Always use parameterized queries or safe query builders.

Never pass raw user input directly into SQL fragments such as:
- where clauses
- order by
- limit
- offset
- dynamic filters

For sortable fields, use allowlists.

Example:
Only allow sorting by:
- created_at
- company_name
- status

Reject unknown sort fields.

---

# Row-Level Access Mindset

Even if the project does not fully use row-level security everywhere, backend code should behave as if row-level protection matters.

Every query should be written with access scope in mind.

Do not write endpoints that return all contractors, all insurance records, or all documents unless the user is explicitly authorized for that scope.

---

# File Upload Security

All uploaded files must be validated.

Validate at minimum:
- file type
- file size
- allowed extensions
- content type when possible

Allowed types should be explicit.

Example allowed types:
- PDF
- JPG
- JPEG
- PNG

Reject:
- executable files
- scripts
- archives unless explicitly needed
- unknown content types

Do not trust only the file extension.

---

# File Storage and Access

Private files must not be globally public by default.

Use signed or scoped access where appropriate.

Rules:
- limit who can view files
- limit who can download files
- limit signed URL lifetime
- avoid exposing raw storage paths unnecessarily

If a file is sensitive, do not make it public just for convenience.

---

# File Name Safety

Do not trust user-provided file names.

Sanitize names or replace them with generated safe storage names.

Avoid path traversal issues and weird special characters.

---

# Rate Limiting and Abuse Prevention

Protect endpoints that are vulnerable to abuse, including:
- auth endpoints
- file uploads
- search endpoints
- public lookup endpoints
- approval actions
- billing/payment actions

Where full rate limiting is not yet implemented, code should still be written with abuse risk in mind.

---

# Status Transition Safety

For approval workflows and business-state changes, validate allowed transitions.

Example:
- pending -> approved
- pending -> rejected

Do not allow arbitrary status changes just because the client submits a value.

Use allowlists for workflow transitions.

---

# Admin Actions

Admin actions must be explicitly protected.

Never expose admin-only actions based only on hidden UI controls.

Examples of admin-only actions:
- approve contractor
- reject contractor
- modify restricted company fields
- override compliance status
- view internal audit details
- issue privileged signed URLs

All such actions must verify admin role server-side.

---

# Error Handling

Do not leak internal implementation details in user-facing errors.

Never expose:
- raw SQL errors
- stack traces
- storage bucket internals
- service keys
- private URLs
- internal auth payloads

Return safe, generic messages to users.
Log more detail server-side only when appropriate.

---

# Logging Rules

Logs must help debugging without leaking secrets or sensitive documents.

Do not log:
- passwords
- tokens
- full tax IDs
- bank details
- full document contents
- signed URLs unless absolutely necessary
- service role credentials

Prefer partial identifiers or safe metadata.

---

# Client vs Server Boundaries

Never move sensitive logic to the client just for convenience.

Sensitive logic includes:
- permission checks
- approval decisions
- signed URL generation
- billing calculations that affect payment integrity
- sensitive document access decisions
- admin validation logic

The client may request an action, but the server must decide.

---

# ID Exposure

Avoid exposing internal identifiers unless needed.

If IDs are exposed, do not assume that secrecy of the ID protects the resource.

Always enforce authorization independently of whether the ID is guessable.

---

# Deletion and Destructive Actions

Destructive actions must be deliberate and protected.

Rules:
- verify permission
- verify ownership or admin authority
- prevent accidental mass deletion
- consider soft delete where appropriate
- do not allow bulk destructive operations without extra safeguards

---

# Secure Defaults for Generated Code

When generating backend code, default to:
- explicit auth checks
- explicit authorization checks
- validated input
- minimal response payloads
- safe error handling
- denied access when uncertain

Do not generate "open for now" shortcuts in protected features.

---

# Third-Party Integrations

Any webhook or third-party callback must be verified.

Examples:
- signature validation
- source validation
- replay protection when relevant

Do not trust incoming external requests without verification.

---

# Frontend Security Guidance

Frontend code must not:
- store sensitive secrets
- assume hidden UI equals permission
- trust local role values without server confirmation
- expose internal admin controls without backend enforcement

Frontend may improve UX, but backend enforces security.

---

# Development and Testing

During development, do not leave insecure shortcuts that can accidentally reach production.

Examples to avoid:
- hardcoded admin users
- disabled auth checks
- wildcard CORS without reason
- public test endpoints left active
- debug responses containing sensitive data

If temporary shortcuts are unavoidable, isolate and remove them clearly before release.

---

# Final Rule

A feature is only complete when:
- it works
- it validates input
- it checks auth
- it checks permissions
- it protects sensitive data
- it fails safely