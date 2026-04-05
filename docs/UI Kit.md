# UI Kit

This UI kit defines the default reusable visual system for Telecom Marketplace.

It exists to keep the product:

- consistent
- fast to build
- visually trustworthy
- easy to scale

IMPORTANT:

This file defines reusable UI patterns only.

It must not override:

- backend logic
- database rules
- auth logic
- business rules

---

# Core Design System

The UI kit is based on the LEOTEOR brand system.

Core colors:

- Brand dark navy: #0A2E5C
- Brand primary blue: #1F6FB5
- Brand accent blue: #2EA3FF
- Brand light blue: #8FC8FF
- Neutral background: #F4F8FC
- Surface white: #FFFFFF
- Text primary: #111827
- Text secondary: #4B5563
- Border: #D9E2EC

---

# Typography

Primary font:

- Geist Sans

## Heading styles

### Page title
Use for main page headings.

- font-size: 24–32px
- font-weight: 600–700
- color: #111827 or #0A2E5C

### Section title
Use for card headers and major blocks.

- font-size: 18–22px
- font-weight: 600
- color: #111827

### Small label
Use for meta labels and field labels.

- font-size: 11–12px
- font-weight: 500–600
- uppercase optional
- color: #6B7280

## Body styles

### Primary body
- font-size: 14–16px
- color: #111827

### Secondary body
- font-size: 14px
- color: #4B5563

### Helper text
- font-size: 12–13px
- color: #6B7280

---

# Spacing Scale

Use a consistent spacing system.

Preferred spacing scale:

- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 40px
- 48px

Rules:

- use 8px / 16px as default spacing rhythm
- use 24px+ between sections
- avoid random spacing values
- keep vertical rhythm consistent

---

# Surface Styles

## Page background
Use:

- background: #F4F8FC

## Card background
Use:

- background: #FFFFFF
- border: 1px solid #D9E2EC
- subtle shadow
- rounded-xl or rounded-2xl

---

# Cards

Cards are the default grouping pattern.

## Standard card
Use for:

- forms
- content blocks
- dashboard summaries
- settings groups
- onboarding sections

Style:

- white background
- soft border
- subtle shadow
- comfortable padding

Recommended classes:

- rounded-2xl
- border border-[#D9E2EC]
- bg-white
- p-4 / p-6
- shadow-sm

## Secondary card
Use for items inside a larger card.

Style:

- slightly tinted background
- same border
- slightly tighter padding

Example:

- bg-[#FCFDFE] or bg-[#F8FAFC]

---

# Buttons

Buttons must clearly communicate hierarchy.

## Primary button
Use for main actions.

Style:

- background: #1F6FB5
- text: #FFFFFF

Use for:

- save
- approve
- continue
- open important flow

## Accent button
Use for highest emphasis CTA.

Style:

- background: #2EA3FF
- text: #FFFFFF

Use for:

- signup
- create job
- submit
- apply

## Secondary button
Use for supporting actions.

Style:

- background: #FFFFFF
- text: #0A2E5C
- border: 1px solid #D9E2EC

Use for:

- back
- cancel
- open details
- neutral actions

## Danger button
Use for destructive or rejection actions.

Style:

- light red background or red outline
- red text
- visible border

Use for:

- reject
- delete
- block

## Button states
Every button must support:

- default
- hover
- focus
- disabled
- loading

Rules:

- loading button should keep width stable
- disabled button should remain readable
- avoid flashy animation

---

# Action Priority

Each screen or section should have a clear action hierarchy.

Rules:

- only one primary CTA per block
- secondary actions must not visually compete
- destructive actions must never look like primary positive actions

Example:

Good:

- [Create Job] primary
- [Cancel] secondary

Bad:

- [Create Job] [Submit] [Save] [Continue] all same style

---

# Links

Links should use brand blue.

Default:

- color: #1F6FB5

Hover:

- color: #0A2E5C

Rules:

- links must be clearly identifiable
- links inside dense text must remain visible
- avoid low-contrast link colors

---

# Forms

Forms are core product UI and must feel premium.

## Input style
Use:

- white background
- visible border
- readable label
- visible focus ring
- enough vertical spacing

Style:

- background: #FFFFFF
- border: 1px solid #D9E2EC
- text: #111827
- label: #0A2E5C

## Form grouping
Group fields logically.

Examples:

- Company info
- Insurance
- Certifications
- Teams
- Settings
- Billing
- Admin review

## Form UX rules
- keep user input on error
- show field-level error where relevant
- show top-level error when needed
- do not silently fail
- disable submit during processing
- long forms should show progress or sections

Avoid:

- resetting form after error
- hiding validation feedback
- mixing unrelated fields in one visual group

---

# Inputs

## Text input
Use for:

- names
- email
- phone
- labels
- titles

## Textarea
Use for:

- descriptions
- admin notes
- comments
- reasons

## Select
Use for:

- enums
- categories
- states
- statuses

## Checkbox
Use for:

- confirmations
- agreement acceptance
- toggles with clear labels

## Radio
Use for:

- mutually exclusive choices when there are few options

---

# Tables

Tables must be easy to scan.

Style:

- white surface
- subtle borders
- readable row height
- soft header background
- status badges

Rules:

- important actions should remain visible
- do not overload rows with too many controls
- use cards instead of tables on narrow mobile screens when needed

---

# Status Badges

Status must always use both color and text.

Recommended tones:

- approved / active → green
- pending → amber
- rejected / blocked → red
- neutral / info → blue or gray-blue

Rules:

- never rely on color alone
- badges should be compact and readable
- wording should be short and consistent

---

# Navigation

Navigation should feel modern and operational.

## Sidebar / dashboard nav
Use:

- compact spacing
- clear active state
- visible hover
- readable text
- subtle tinted active background

## Header nav
Use:

- logo left
- actions right
- clean spacing
- minimal clutter

Rules:

- navigation should be visually lighter than content
- active state must be obvious
- destructive actions should not sit in the same visual tone as primary nav

---

# Logo Treatment

Use the LEOTEOR logo consistently.

Preferred placement:

- top-left in header
- auth pages
- dashboard chrome
- sidebar header when needed

Rules:

- keep logo small
- do not overscale
- logo should support trust, not dominate screen

---

# Page Structure Patterns

## Standard dashboard page
Use:

- page title
- short description
- stats or summary row
- main content cards
- actions grouped clearly

## Details page
Use:

- back action
- page title
- metadata row
- content blocks
- action section

## Form page
Use:

- title
- helper text
- grouped fields
- bottom actions

---

# Feedback & Interaction States

UI must always respond to user actions.

Rules:

- every action must give feedback
- user must understand what is happening

Examples:

- button click → loading state
- form submit → disabled button + processing state
- success → clear confirmation or redirect
- error → readable message

Avoid:

- silent actions
- frozen UI
- invisible processing

---

# Empty States

Empty states must feel intentional.

Include:

- short explanation
- next action when possible

Example:

- "No jobs yet"
- CTA: "Create your first job"

Rules:

- empty states should not feel broken
- empty states should encourage progress

---

# Loading States

Loading states must be polished and calm.

Use:

- subtle text
- skeletons or soft placeholders where helpful
- disabled actions during critical loads

Avoid:

- flashing layouts
- jumpy page shifts
- aggressive spinners everywhere

---

# Error States

Error states must be calm and actionable.

Use:

- readable text
- non-panicked color usage
- clear next step if possible

Good examples:

- "Something went wrong. Please try again."
- "Could not load data."

Avoid:

- raw server errors
- stack traces
- technical panic language

---

# Responsive Patterns

UI must work on:

- desktop
- tablet
- mobile

Rules:

- forms must stack cleanly
- tables must remain usable
- actions must stay reachable
- cards should collapse gracefully
- navigation must remain readable

---

# Analytics-Aware UI

Important UI actions should map cleanly to analytics.

Rules:

- primary actions should be explicit
- important flows should be easy to identify in UI
- avoid hidden important actions

Examples of analytics-aligned UI actions:

- login
- signup
- submit bid
- create job
- onboarding submit
- approve / reject actions

This does not change appearance directly, but improves product clarity.

---

# Consistency Rule

UI patterns with the same meaning must look the same across the app.

Examples:

- all Save buttons should share one style
- all Submit buttons should share one style
- all Back buttons should share one style
- all status badges should follow same tone system

Avoid visual randomness.

---

# Final Rule

The UI kit exists to make the product:

- consistent
- premium
- scalable
- easy to build

Every new screen should be assembled from this system instead of inventing a new one.