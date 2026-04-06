# LEOTEOR UI Design System

This document is the single source of truth for UI, visual design, interaction presentation, reusable screen styling, and shared interface patterns across the LEOTEOR Telecom Marketplace.

It defines:

* visual language
* color system
* typography
* spacing
* surfaces
* cards
* forms
* buttons
* links
* tables
* navigation appearance
* status treatment
* page structure patterns
* responsive behavior
* loading, empty, and error states
* reusable UI patterns
* analytics-aware action visibility

It does not define:

* backend logic
* database rules
* auth logic
* business rules
* frontend architecture patterns

For code architecture, component structure, and implementation conventions, see the frontend architecture documentation.

---

## 1. Product visual philosophy

The product must look like a modern B2B SaaS platform for telecom and infrastructure workflows.

Design goals:

* trustworthy
* clean
* premium
* operational
* readable
* scalable
* conversion-focused

The interface should feel closer to:

* Stripe
* Linear
* Vercel
* modern enterprise dashboards

Avoid:

* childish UI
* random decorative styling
* bulky shadows
* black-and-white default styling
* inconsistent button colors
* dense, cluttered layouts
* visually loud mockup-like design
* template-looking pages

The UI should feel like a real production product used by serious companies.

---

## 2. Brand foundation

The interface must stay aligned with the LEOTEOR logo and brand palette.

The default visual system must be built around the logo colors, which are based on blue tones and white.

Black must not be used as the default primary UI color.
The product should not revert to black-based buttons, black-heavy headers, or black-first visual styling unless there is a very specific product reason.

### Official core colors

* Brand dark navy: `#0A2E5C`
* Brand primary blue: `#1F6FB5`
* Brand accent blue: `#2EA3FF`
* Brand light blue: `#8FC8FF`
* Neutral page background: `#F4F8FC`
* Surface white: `#FFFFFF`
* Text primary: `#111827`
* Text secondary: `#4B5563`
* Muted helper text: `#6B7280`
* Border: `#D9E2EC`

### Color intent

* `#0A2E5C` = trust, headings, brand gravity
* `#1F6FB5` = primary product action
* `#2EA3FF` = accent and highest-emphasis CTA
* `#8FC8FF` = light supporting brand tone
* `#F4F8FC` = soft SaaS canvas
* `#FFFFFF` = content surface
* `#111827` = readable primary text
* `#4B5563` and `#6B7280` = secondary and helper information

---

## 3. Clickable color and accessibility rules

The color system must prioritize both brand consistency and clickability.

The chosen CTA colors must be the most clickable and trustworthy options within the approved LEOTEOR palette.

### Accessibility requirements

Accessibility is required.

Rules:

* maintain strong contrast
* prefer dark text on light backgrounds
* do not rely only on color to communicate state
* interactive elements must remain readable for users with low vision or color-vision deficiencies
* buttons and links must be visually obvious
* use text, borders, icons, or labels in addition to color where needed

Preferred safe combinations:

* `#0A2E5C` text on `#FFFFFF`
* `#0A2E5C` text on `#F4F8FC`
* white text on `#1F6FB5`
* white text on `#2EA3FF`

Avoid:

* light blue text on white
* weak gray text on light backgrounds
* color-only status signaling

---

## 4. Page and surface rules

### Page background

Default page background:

`#F4F8FC`

This applies to:

* dashboard canvas
* auth pages
* general app background
* admin pages
* settings pages
* list pages

### Surface background

Default surface background:

`#FFFFFF`

### Standard card pattern

* white background
* `1px solid #D9E2EC`
* subtle shadow
* `rounded-xl` or `rounded-2xl`
* comfortable padding

Recommended default card classes:

* `rounded-2xl`
* `border border-[#D9E2EC]`
* `bg-white`
* `p-4` or `p-6`
* `shadow-sm`

### Secondary inner surfaces

Use softer inner surfaces inside larger cards when needed:

* `#F8FAFC`
* `#F8FBFF`
* `#FCFDFE`

Use for:

* summary panels inside forms
* helper cards
* nested info blocks
* metadata panels
* secondary items inside major cards

---

## 5. Typography

### Primary font

Geist Sans

Typography goals:

* clean
* modern
* readable
* professional

### Heading styles

#### Page title

Use for main page headings.

* size: `24–32px`
* weight: `600–700`
* color: usually `#0A2E5C`

#### Section title

Use for card headers and major content sections.

* size: `18–22px`
* weight: `600`
* color: `#0A2E5C` or `#111827`

#### Small label

Use for:

* field labels

* meta labels

* small headers

* size: `11–12px`

* weight: `500–600`

* color: `#6B7280`

* uppercase optional

### Body text

#### Primary body

* size: `14–16px`
* color: `#111827`

#### Secondary body

* size: `14px`
* color: `#4B5563`

#### Helper text

* size: `12–13px`
* color: `#6B7280`

Avoid:

* tiny fonts
* weak gray for important information
* oversized decorative headings

---

## 6. Spacing system

Use a consistent spacing scale.

Approved spacing rhythm:

* `4px`
* `8px`
* `12px`
* `16px`
* `24px`
* `32px`
* `40px`
* `48px`

Rules:

* use `8px` and `16px` as the base rhythm
* use `24px+` between major sections
* avoid random spacing values
* keep vertical rhythm consistent
* default block spacing should feel calm and breathable

---

## 7. Buttons and action hierarchy

Buttons must clearly communicate hierarchy.

### Primary button

Use for the main action in a section.

Style:

* background: `#1F6FB5`
* text: `#FFFFFF`

Use for:

* save
* continue
* approve
* open main flow
* standard primary action

### Accent button

Use for the highest-emphasis CTA.

Style:

* background: `#2EA3FF`
* text: `#FFFFFF`

Use for:

* signup
* submit
* create
* apply
* send
* save and continue
* high-emphasis completion actions

### Secondary button

Use for support and navigation actions.

Style:

* background: `#FFFFFF`
* text: `#0A2E5C`
* border: `1px solid #D9E2EC`

Use for:

* back
* cancel
* return
* open details
* neutral actions

### Tertiary / ghost action

Use sparingly.

Style:

* transparent or very light background
* text: `#1F6FB5`

Use for:

* inline secondary actions
* low-weight utility actions

### Danger button

Use only for destructive actions.

Style:

* light red background or red outline
* red text
* clearly destructive tone

Use for:

* delete
* reject
* remove
* destructive admin actions

### Button state rules

Every button must support:

* default
* hover
* focus
* disabled
* loading

Rules:

* loading should not shift width dramatically
* disabled state must remain readable
* hover may darken slightly
* use subtle shadow increase only if needed
* no flashy animations
* no glossy or consumer-app styling

### Action hierarchy rule

Each section should have only one visually dominant primary action.

Bad:

* several same-weight blue buttons in one block

Good:

* one dominant action
* secondary actions visually quieter
* destructive actions clearly separated

---

## 8. Links

Default link color:

`#1F6FB5`

Hover:

`#0A2E5C`

Rules:

* links must be identifiable
* links must not look like plain body text
* do not use weak low-contrast blue on white

---

## 9. Forms

Forms are core product UI and must feel premium, structured, and operational.

### Input style

Use:

* white background
* visible border
* readable label
* visible focus ring
* enough spacing

Preferred form field style:

* background: `#FFFFFF`
* border: `1px solid #D9E2EC`
* text: `#111827`
* label: `#0A2E5C`
* focus ring using brand blue

### Form grouping

Group fields logically.

Examples:

* company info
* insurance
* certifications
* teams
* settings
* billing
* admin review
* feedback thread actions

### Form UX rules

* preserve user input on validation errors
* show field-level errors where relevant
* allow top-level error for form-wide failure
* disable submit while processing
* show success state after submit
* never silently fail
* long forms should use sections, blocks, or progress grouping

Avoid:

* clearing form after error
* invisible loading
* raw backend error dumps
* mixing unrelated fields in one group

---

## 10. Inputs by type

### Text input

Use for:

* names
* email
* phone
* titles
* labels

### Textarea

Use for:

* descriptions
* admin notes
* comments
* reasons

### Select

Use for:

* enums
* categories
* states
* statuses

### Checkbox

Use for:

* confirmations
* agreement acceptance
* clear labeled toggles

### Radio

Use for:

* mutually exclusive options with a small number of choices

---

## 11. Cards and lists

Cards are the default grouping pattern across the product.

Use cards for:

* forms
* settings groups
* feedback threads
* review blocks
* admin summaries
* list items
* onboarding steps
* dashboard summaries

### Standard card

* white background
* soft border
* subtle shadow
* `rounded-2xl`
* readable spacing

### List item card

Use slightly tighter spacing but keep the same system:

* white background
* border `#D9E2EC`
* `shadow-sm`
* hover background may shift slightly to `#F8FAFC`

### Secondary card

Use inside larger cards:

* slightly tinted background
* same border or lighter separation
* tighter padding

Example backgrounds:

* `#FCFDFE`
* `#F8FAFC`
* `#F8FBFF`

---

## 12. Tables

Tables must be clean and easy to scan.

Use:

* white surface
* subtle borders
* readable row height
* soft header background
* badges for statuses

Rules:

* important actions should remain visible
* do not overload rows with too many controls
* on mobile, tables should convert to card patterns when needed

---

## 13. Status badges

Status must always use both:

* color
* text

Recommended tones:

* approved / active / resolved → green
* waiting / pending → amber
* informational / in review / neutral → blue
* closed / inactive → slate or gray
* rejected / blocked / destructive → red

Rules:

* compact
* readable
* consistent wording
* never rely on color alone

Examples of acceptable wording:

* New
* In review
* Waiting for user
* Planned
* Resolved
* Closed

---

## 14. Navigation

Navigation should feel modern, light, and operational.

### Sidebar

Use:

* compact but readable spacing
* clear active state
* visible hover
* soft tinted active background
* readable text

Active state should use:

* `#0A2E5C` text
* soft blue-tinted background
* subtle border if helpful

### Header

Use:

* logo left
* actions right
* clean spacing
* minimal clutter

### Navigation consistency

Elements with the same meaning should look the same:

* all back buttons
* all sidebar active states
* all main nav links
* all top-right neutral actions

---

## 15. Logo treatment

Use a small LEOTEOR logo consistently.

Preferred placement:

* top-left in header
* dashboard chrome
* auth header
* sidebar header when appropriate

Rules:

* keep logo small
* do not overscale
* it should support trust, not dominate layout
* clicking the logo should return the user to the correct home or dashboard route

Use:

* `/logo.png`

### Favicon / browser tab icon

The site should include branded logo treatment in the browser tab.

Preferred implementation:

* favicon generated from logo
* consistent branding in browser tab and app metadata

---

## 16. Page structure patterns

### Standard dashboard page

Should usually contain:

* page title
* short description
* optional summary row
* main content cards
* clearly grouped actions

### Detail page

Should usually contain:

* back action
* page title
* metadata row
* content blocks
* action section

### Form page

Should usually contain:

* title
* helper text
* grouped fields
* bottom or contextual actions

### Feedback / support page

Should usually contain:

* page title
* explanation
* form card
* history or list card
* thread detail card when signed in

### Landing page

Should usually contain:

* header
* hero section
* primary CTA
* login/signup actions
* footer

---

## 17. Reusable UI patterns

These are the default reusable patterns for new screens.

### Summary row

Use for:

* dashboard metrics
* quick totals
* system overview

Pattern:

* row of compact white cards
* short label
* prominent value
* optional small helper text

### Form section block

Use for:

* long forms
* onboarding
* settings

Pattern:

* section title
* helper text
* grouped fields
* clear spacing between groups

### Review card

Use for:

* admin review
* compliance review
* approval queues

Pattern:

* entity title
* metadata row
* status badge
* action row
* optional notes block

### Thread / history card

Use for:

* feedback threads
* support history
* request changes

Pattern:

* thread header
* metadata
* messages or items list
* reply area or status notice

### Empty state card

Use for:

* no jobs
* no bids
* no teams
* no approvals yet

Pattern:

* short explanation
* optional helper sentence
* clear next CTA

### Metadata row

Use for:

* detail pages
* job pages
* contractor/customer profiles

Pattern:

* compact horizontal info row
* muted labels
* readable values
* wraps cleanly on smaller screens

---

## 18. Feedback and interaction states

Every important action must produce visible UI feedback.

Required interaction states:

* loading
* success
* error
* disabled
* empty state when relevant

Examples:

* submit → button loading + disabled
* success → visible confirmation
* error → readable calm message
* thread closed → disabled reply input + clear notice
* loading list → calm loading block

Avoid:

* silent clicks
* frozen UI
* unclear system state

---

## 19. Empty, loading, and error states

### Empty states

Must feel intentional.

Include:

* short explanation
* optional CTA

### Loading states

Must feel calm and unobtrusive.

Use:

* subtle text
* skeletons if useful
* no chaotic spinners everywhere

### Error states

Must be readable and calm.

Good:

* “Unable to load feedback.”
* “This thread is closed.”
* “Could not load data.”

Bad:

* raw stack traces
* panic language
* visually broken pages

---

## 20. Responsive behavior

All screens must work on:

* desktop
* tablet
* mobile

Rules:

* forms stack cleanly
* actions remain reachable
* cards collapse naturally
* sidebars may become header chips or stacked nav on small screens
* tables should convert to card patterns on mobile when needed
* important actions must remain visible and usable

---

## 21. Analytics-aware UI

Important actions must remain visually explicit and easy to identify.

Examples:

* login
* signup
* create job
* submit bid
* onboarding completion
* admin approval
* feedback submit
* feedback reply
* payment

The UI should not hide critical actions in low-visibility areas.

This improves both UX clarity and analytics reliability.

---

## 22. Consistency rule

Elements with the same meaning must use the same visual system across the product.

Examples:

* all Back buttons use the same secondary button style
* all Save buttons use the same primary style
* all Submit / Send buttons use the same accent style when they are the main CTA
* all status badges follow the same tone logic
* all cards follow the same border/shadow/radius system

Avoid random per-page reinvention.

---

## 23. Final implementation direction

Default UI should always trend toward:

* page background `#F4F8FC`
* white cards
* headings in `#0A2E5C`
* primary actions in `#1F6FB5`
* accent actions in `#2EA3FF`
* secondary actions with white background and `#D9E2EC` border
* readable text hierarchy
* subtle borders
* subtle shadows
* compact, modern enterprise spacing
* calm, visible system feedback

This is the official default visual language for LEOTEOR Telecom Marketplace.

Do not invent a different styling language on new pages unless there is a strong product reason.

Do not default to black-first UI.

The visual system must remain centered on the LEOTEOR logo palette: blue tones, white surfaces, calm enterprise contrast, and highly clickable CTA colors chosen from that brand system.
