# Frontend Architecture Patterns

The frontend uses Next.js with React and Tailwind.

All UI should follow consistent patterns.

---

# Folder Structure

app/

pages and routes

components/

reusable UI components

lib/

utility functions

services/

API communication

hooks/

custom React hooks

---

# Component Rules

Components must be:

- reusable
- small
- single responsibility

Avoid large components.

---

# Example Component Structure

components/

Button.tsx  
Card.tsx  
Input.tsx  
Table.tsx

---

# Page Layout Pattern

Each page should use:

Page container  
Header section  
Content section  
Card blocks

Example layout:

Header

Page title  
Description

Content

Cards  
Tables  
Forms

---

# Styling

Use Tailwind.

Preferred spacing:

p-4  
p-6  
gap-4  
gap-6

Rounded corners:

rounded-xl

Shadows:

shadow-sm

---

# State Management

Prefer:

React state  
Server actions  
Supabase queries

Avoid unnecessary global state.

---

# Forms

Forms should include:

validation  
error states  
success states

Use clear labels and helper text.

---

# Empty States

Every page must handle:

loading state  
empty state  
error state

Example:

"No contractors found"

with button

"Add contractor"