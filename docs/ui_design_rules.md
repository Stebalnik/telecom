# UI Design Rules

These rules ensure consistent design across the Telecom Marketplace.

IMPORTANT:
These rules apply only to UI, layout, styling, visual hierarchy, and presentation.
They must not force changes to backend logic, database logic, authentication, or business rules.

---

# Design Philosophy

The product should look like a modern B2B SaaS platform for telecom and infrastructure workflows.

Style goals:

- trustworthy
- clean
- premium
- operational
- highly readable
- conversion-focused

The interface should feel similar in quality to:

- Stripe
- Linear
- Vercel
- modern enterprise dashboards

Avoid:

- childish UI
- overly decorative design
- random color usage
- bulky shadows
- template-looking layouts
- heavy black-on-white everywhere if a softer branded option is better

---

# Brand Direction

This project must visually align with the LEOTEOR brand and logo.

Use the logo palette as the foundation of the UI system.

Core brand colors derived from logo:

- Brand dark navy: #0A2E5C
- Brand primary blue: #1F6FB5
- Brand accent blue: #2EA3FF
- Brand light blue: #8FC8FF
- Neutral background: #F4F8FC
- Surface white: #FFFFFF
- Text primary: #111827
- Text secondary: #4B5563
- Border: #D9E2EC

Do not use pure black as the main brand color for primary actions unless there is a very specific reason.
The old black-based button system should not be the default.

---

# Clickable Color Rules

Use the most clickable and trustworthy colors from the approved brand palette.

## Primary CTA
Use:

- background: #1F6FB5
- text: #FFFFFF

This is the default primary button color.

## High-emphasis CTA
Use:

- background: #2EA3FF
- text: #FFFFFF

Use this for:

- signup
- submit
- create job
- apply
- save and continue
- high-priority actions

## Secondary actions
Use:

- background: #FFFFFF
- text: #0A2E5C
- border: 1px solid #D9E2EC

## Tertiary / ghost actions
Use:

- transparent or very light background
- text: #1F6FB5

Do not use weak low-contrast blue text on white backgrounds.

---

# Accessibility and Contrast

Accessibility is required.

Rules:

- maintain strong contrast
- prefer dark text on light backgrounds
- do not rely only on color to communicate status
- interactive elements must remain readable for users with low vision or color-vision deficiencies
- buttons and links must be visually obvious
- use labels, icons, borders, or text in addition to color for states

Preferred safe combinations:

- text #0A2E5C on #FFFFFF
- text #0A2E5C on #F4F8FC
- white text on #1F6FB5
- white text on #2EA3FF

Avoid:

- light blue text on white
- gray text with weak contrast
- color-only status signaling

---

# Background Rules

Preferred page background:

- #F4F8FC

Preferred card / surface background:

- #FFFFFF

This creates a softer, more premium interface than plain white everywhere.

Use pure white for:

- cards
- modals
- forms
- tables
- dropdowns

Use #F4F8FC for:

- app background
- section background
- dashboard canvas
- auth page background when appropriate

---

# Typography

Primary font:

- Geist Sans

Typography goals:

- clean
- modern
- readable
- professional

## Headings
Use:

- bold
- strong hierarchy
- color #0A2E5C when appropriate

## Body text
Use:

- #111827 for main text
- #4B5563 for secondary text

Avoid:

- tiny fonts
- weak gray for important information
- oversized decorative headings

---

# Layout Rules

Landing pages must include:

- Header
- Main section
- Footer

Dashboard pages must include:

- Sidebar or header navigation
- Main content area
- clear section spacing
- consistent card layout

General layout principles:

- generous spacing
- strong alignment
- max-width containers
- responsive sections
- no clutter
- no dense walls of text

Preferred visual structure:

- page background: #F4F8FC
- content inside white cards
- soft borders
- subtle shadows
- rounded corners

---

# Card Style

Cards should be the default grouping pattern.

Card style:

- background: #FFFFFF
- border: 1px solid #D9E2EC
- subtle shadow
- rounded-xl or rounded-2xl
- comfortable padding

Cards should feel polished, not flat and lifeless.

Use cards for:

- forms
- dashboard blocks
- lists
- onboarding sections
- contractor summary blocks
- insurance and certification sections

---

# Buttons

## Primary button
- background: #1F6FB5
- text: #FFFFFF

## Accent button
- background: #2EA3FF
- text: #FFFFFF

## Secondary button
- background: #FFFFFF
- text: #0A2E5C
- border: 1px solid #D9E2EC

Buttons must have:

- hover state
- focus state
- disabled state

Recommended hover behavior:

- slightly darker appearance
- subtle shadow increase
- no flashy animation

Avoid:

- black primary buttons by default
- low-contrast text
- tiny buttons
- overly rounded cartoon-style pills unless explicitly needed

---

# Links

Links should use brand blue tones, not generic browser blue.

Default link color:

- #1F6FB5

Hover:

- #0A2E5C

Links must be visually identifiable.

---

# Forms

Forms must be simple, structured, and premium.

Group fields logically.

Examples:

- Company info
- Insurance
- Certifications
- Teams
- Settings

Inputs should use:

- white background
- clear border
- visible focus ring
- readable labels
- enough spacing

Preferred input style:

- background: #FFFFFF
- border: 1px solid #D9E2EC
- text: #111827
- label: #0A2E5C
- focus ring using brand blue

Avoid default browser-looking forms.

---

# Tables

Tables must be clean and easy to scan.

Use:

- white surface
- subtle borders
- readable row height
- soft header background
- badges for statuses

Status badges should use both color and text.

Suggested badge colors:

- approved / active: green-tinted background + dark text
- pending: amber-tinted background + dark text
- rejected / blocked: red-tinted background + dark text
- informational / neutral: blue-tinted background + dark text

Do not rely on color alone.

---

# Navigation

Navigation should feel modern and structured.

Use:

- compact but readable spacing
- clear active state
- visible hover state
- consistent icon and text alignment

Active navigation state should use:

- brand blue or dark navy
- soft background tint when helpful

Avoid large bulky navigation blocks.

---

# Logo Usage

A small LEOTEOR logo should be present across the product so branding stays consistent without becoming distracting.

## Rules for page logo
Use a small logo on all major pages.

Preferred locations:

- top-left in header
- top-left in dashboard chrome
- auth pages header
- landing page header

Logo must be:

- small
- unobtrusive
- not larger than necessary
- aligned cleanly with page title or navigation

Recommended behavior:

- clicking logo returns user to the correct home/dashboard route

## File path
Use:

- /public/logo.png

or in code:

- /logo.png

Do not place a large hero-style logo on every internal page.
Only the landing page or auth pages may use a more prominent logo treatment.

---

# Favicon / Browser Tab Icon

The site should include branded logo in the browser tab.

Use the logo as the basis for favicon / tab icon.

Preferred implementation:

- favicon generated from logo
- consistent branding in browser tab and loading state where supported

If framework metadata is used, favicon and app icons should be wired there.

---

# Landing Page Structure

Landing page should include:

Header

- small logo
- login
- signup

Hero section

- logo or product visual
- short description
- CTA

CTA buttons

- Get Started
- Login

Footer

- © LEOTEOR LLC
- Terms
- Privacy
- Contact

Landing page should use the brand palette, not black as the primary visual language.

---

# Dashboard UI

Dashboards should prioritize:

- clarity
- speed
- data visibility
- operational trust
- scanability

Avoid decorative clutter.

Dashboards should feel like a polished enterprise product, not a mockup.

---

# Responsive Design

All pages must work on:

- desktop
- tablet
- mobile

Mobile layout must not break:

- forms
- navigation
- tables
- actions
- filters

Important actions should remain visible and usable on smaller screens.

---

# Empty, Loading, and Error States

Every page should have polished system states.

## Empty states
Should feel intentional and helpful.

## Loading states
Should look clean and unobtrusive.

## Error states
Should be readable, calm, and actionable.

Do not leave pages visually broken when data is missing.

---

# Final Rule

Do not generate plain black-and-white UI by default.

Default UI should use:

- #F4F8FC page background
- white cards
- #0A2E5C headings
- #1F6FB5 primary actions
- #2EA3FF accent CTAs
- subtle borders and soft shadows
- small LEOTEOR logo in consistent header placement
- branded favicon / tab icon

Every page should look production-ready, attractive, and aligned with the LEOTEOR logo and telecom brand.