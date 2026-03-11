# API Contracts

This file defines the response and request conventions for APIs in this project.

IMPORTANT:
These rules define interface consistency only.
They do NOT define or freeze architecture.
They apply whether the project uses route handlers, server actions, Supabase functions, or any other backend pattern.

---

# Main Principle

All APIs must be predictable and consistent.

Frontend code should not need custom parsing logic for every endpoint.

Use one response format across the project unless there is a very strong reason not to.

---

# Standard Success Response

Use this shape for successful API responses:

```json
{
  "success": true,
  "data": {}
}