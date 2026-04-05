# Frontend Patterns

Framework:

- Next.js App Router

---

# Folder Structure

app/

- routes  
- layouts  
- pages  

components/

- reusable UI components  

lib/

- shared logic (analytics, errors, helpers)

---

# Route Structure

Public:

/  
/login  
/signup  

Protected:

/dashboard  
/customer  
/contractor  
/admin  

---

# Layout Pattern

Root layout:

- global fonts  
- global styles  

App layout:

- header navigation  
- dashboard wrapper  

---

# Navigation

Rules:

- never hardcode URLs in multiple places  
- use centralized route constants when possible  
- keep navigation consistent across layouts  

---

# Authentication

Handled by Supabase.

Rules:

- all protected routes must check session  
- never trust only client state  
- redirect if no session  

---

# Role Routing

After login redirect by role:

- customer → /customer  
- contractor → /contractor  
- admin → /admin  

---

# API Communication

Frontend must call:

- Next.js API routes  

Avoid:

- direct Supabase writes (unless explicitly safe and intentional)

Benefits:

- centralized logic  
- better security  
- easier debugging  

---

# Analytics (Default Rule)

Analytics is REQUIRED by default but must be clean.

Use ONLY:

lib/track.ts

Example:

track("login")  
track("submit_bid", { jobId })

Rules:

- do NOT use fetch directly for analytics  
- do NOT duplicate tracking logic  
- do NOT scatter analytics across code  

---

# When to Track

Track ONLY important actions:

- login success  
- signup success  
- onboarding started/submitted  
- job created  
- bid submitted  
- mission page opened  
- donation started  
- admin actions  

---

# When NOT to Track

Do NOT track:

- every click  
- every render  
- low-value actions  

Keep analytics meaningful.

---

# Placement of Analytics

Correct:

- after successful action  
- inside handlers (onSubmit, onSuccess)  

Wrong:

- before API success  
- inside every component render  

---

# Error Handling (UI)

Rules:

- always show user-friendly messages  
- never expose internal errors  
- avoid technical details in UI  

Examples:

Good:

"Something went wrong. Please try again."

Bad:

"Supabase insert failed: duplicate key..."

---

# Error Logging (Required)

All errors must be logged.

Use:

lib/logError.ts

Example:

logError("submit_bid_failed", { jobId, error })

Rules:

- log silently  
- do not block UI  
- do not spam logs  

---

# Separation of Concerns

Frontend must NOT:

- handle business logic deeply  
- write complex DB logic  
- manage security  

Frontend should:

- call API  
- render UI  
- trigger analytics  
- log errors  

---

# Shared Helpers (Mandatory)

All repeated logic must go to lib/

Required helpers:

- lib/track.ts  
- lib/logError.ts  

Optional:

- lib/routes.ts  
- lib/api.ts  

---

# Clean Code Rule

Avoid:

- duplicated fetch calls  
- duplicated event names  
- inline analytics logic  
- inline error logging everywhere  

Prefer:

- small helpers  
- reusable functions  
- clean handlers  

---

# Minimal Feature Pattern

Every feature should follow:

1. user action (click / submit)  
2. call API  
3. if success → track()  
4. if error → logError() + show message  

---

# Performance Rule

Frontend must remain fast.

Avoid:

- heavy analytics logic  
- blocking calls  
- unnecessary rerenders  

Analytics and logging must be lightweight.

---

# Final Rule

Frontend must be:

- clean  
- predictable  
- centralized  
- easy to scale  

Analytics and error logging are:

- built-in  
- consistent  
- minimal in code  
- mandatory in behavior  
