# Backend Development Rules

Backend logic must be independent from UI.

Never place business logic inside UI components.

---

# Architecture

Backend layers:

API layer  
Service layer  
Database layer

---

# API Rules

APIs must:

- validate input
- return consistent responses
- handle errors properly

Response format example

{
  success: true,
  data: {}
}

Error example

{
  success: false,
  error: "message"
}

---

# Security

Always:

validate input  
sanitize data  
check authentication

Never trust client data.

---

# Authentication

Use Supabase authentication.

All protected endpoints must verify user identity.

---

# Logging

Errors should be logged clearly.

Do not expose sensitive data.

---

# Code Style

Functions should:

- be small
- have clear names
- handle one responsibility