# AI Context for Project

This file defines how AI should behave when generating code for this project.

IMPORTANT:
AI must prioritize functionality, stability, and maintainability over visual improvements.

UI design rules apply only when generating frontend or UI code.

If a task is related to:
- backend
- database
- APIs
- infrastructure
- business logic

Then UI design rules must be ignored.

---

# Project Overview

This project is a **modern telecom contractor marketplace platform**.

Purpose:

Connect telecom customers with verified contractors and crews.

The system manages:

- contractor profiles
- certifications
- insurance (COI)
- crew teams
- job marketplace
- contractor approval workflows
- compliance validation
- job assignments
- payments and billing

---

# Technology Stack

Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

Backend
- Supabase
- PostgreSQL
- REST / Server Actions

Infrastructure
- Vercel deployment
- Supabase database
- secure auth system

---

# AI Development Principles

Always follow these priorities:

1. Functional correctness
2. Clean architecture
3. Maintainable code
4. Security
5. Performance
6. UI consistency

Never sacrifice functionality for design.

---

# When generating UI

Follow rules from:

docs/ui_design_rules.md

and

docs/frontend_patterns.md

---

# When generating backend code

Follow rules from:

docs/backend_rules.md

and

docs/database_schema.md

---

# Code Quality Rules

Always:

- write clean readable code
- avoid duplication
- use reusable components
- separate UI and logic
- follow project folder structure

Avoid:

- large monolithic files
- inline business logic inside UI
- mixing database logic with UI code