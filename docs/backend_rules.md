# Backend Rules

Backend is implemented using:

Next.js API routes

and

Supabase.

---

# API Structure

app/api/

Example

app/api/jobs/route.ts

---

# Responsibilities

API routes handle:

validation  
authentication  
database operations

---

# Supabase Usage

Two clients may exist.

Client side

supabase anon key

Server side

supabase service role key

Service role must NEVER reach frontend.

---

# Validation

All incoming requests must validate:

user authentication  
user role  
input data

---

# Error Responses

Always return structured errors.

Example

{
  error: "Invalid request"
}

---

# Logging

Important operations should log:

user id  
operation  
timestamp