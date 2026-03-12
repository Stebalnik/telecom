# Frontend Patterns

Framework

Next.js App Router

---

# Folder Structure

app/

routes  
layouts  
pages

components/

reusable UI components

lib/

utility functions

---

# Route Structure

Public

/  
/login  
/signup

Protected

/dashboard  
/customer  
/contractor  
/admin

---

# Layout Pattern

Root layout

global fonts  
global styles

App layout

header navigation  
dashboard wrapper

---

# Navigation

Never hardcode URLs in multiple places.

Use centralized route constants when possible.

---

# Authentication

Authentication is handled by Supabase.

All protected routes must check session.

---

# Role Routing

After login user must be redirected by role:

customer → /customer  
contractor → /contractor  
admin → /admin

---

# API Communication

Frontend should call:

Next.js API routes

Not Supabase directly unless necessary.

---

# Error Handling

Always show user-friendly errors.

Avoid exposing internal server errors.