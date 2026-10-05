
# Frontend Design System

## 1. Product Design Direction

The **AI Interview Preparation Tool** should feel like a premium, professional interview/recruiting SaaS product.

The visual direction is:

**Swiss-modern + restrained SaaS + professional recruiting software.**

The interface should feel:

* Professional
* Calm
* Modern
* Focused
* Information-rich
* Trustworthy
* Clean
* Efficient

It should **not** look like a generic "AI app".

Avoid common AI-product clichés such as:

* excessive purple/blue gradients
* glowing effects
* excessive glassmorphism
* decorative blobs
* futuristic backgrounds
* excessive rounded cards
* unnecessary animated backgrounds
* excessive "AI-powered" visual elements
* overly colorful dashboards

The product should communicate quality through **typography, spacing, hierarchy, consistency and usability**, not decoration.

---

# 2. Design Decision Hierarchy

When designing any frontend feature, use this priority order:

1. Existing implemented frontend patterns
2. Relevant screenshots in `frontend/screenshots/`
3. This `Design.md`
4. Sound product and UI design judgment

Screenshots are **inspiration**, not exact specifications.

If there is no screenshot for a particular page, component, interaction or state, do not stop and ask for one automatically.

Make a reasonable design decision using the existing application and this design system.

The frontend should remain visually consistent even when no direct inspiration exists.

---

# 3. Typography

## Primary Font

Use:

**Inter**

as the primary application font.

Geist or Manrope may be used only when there is a strong design reason.

Do not unnecessarily mix multiple fonts.

## Typography Principles

Typography should establish hierarchy before color or decoration.

Use clear levels for:

* page titles
* section headings
* card headings
* body text
* secondary information
* labels
* captions
* metadata

Avoid excessively large typography except where the hierarchy genuinely requires it.

Text should remain highly readable at all screen sizes.

---

# 4. Color System

The color palette should remain restrained.

## Background

Primary application background:

```text
#F7F7F5
```

This warm neutral should be the primary page background where appropriate.

## Primary Text

Use near-black:

```text
#171717
```

Avoid pure black unless necessary.

## Secondary Text

Use a muted neutral gray around:

```text
#6B6B6B
```

Secondary text should remain readable but clearly subordinate to primary content.

## Borders

Use subtle neutral borders around:

```text
#E7E7E4
```

Borders should define structure without becoming visually dominant.

## Cards

Cards should generally use:

```text
#FFFFFF
```

or a very subtle off-white variation.

Cards should visually separate themselves from the warm page background without relying heavily on shadows.

---

# 5. Accent Color

Use **one primary accent color throughout the application**.

The accent should be restrained and purposeful.

Use it primarily for:

* primary actions
* active navigation
* links
* selected states
* focused controls
* important highlights
* meaningful chart highlights

Do not introduce multiple competing accent colors.

The accent should not dominate the interface.

## Semantic Colors

Status colors are allowed when they communicate meaning:

* success
* warning
* error
* informational states

These are semantic colors, not additional brand accents.

Do not use status colors decoratively.

---

# 6. Border Radius

Preferred radius:

```text
8px – 12px
```

Use consistent radius values throughout the application.

Avoid excessive pill-shaped UI unless the component specifically requires it.

Avoid very large radii such as:

```text
20px+
```

for normal cards and containers.

Small radius differences may be used to establish hierarchy, but consistency is more important than having many radius values.

---

# 7. Shadows and Elevation

Use minimal shadows.

Prefer:

* borders
* spacing
* background contrast
* typography

to create hierarchy.

Use shadows only when they communicate meaningful elevation, such as:

* dropdowns
* popovers
* modals
* floating controls
* elevated navigation elements

Avoid heavy card shadows.

Avoid the appearance of every component floating above the page.

---

# 8. Gradients

Gradients should be almost nonexistent.

Do not use gradients simply because the product uses AI.

Avoid:

* gradient backgrounds
* glowing gradient borders
* gradient text
* decorative gradient blobs

A gradient may be used only when it provides a clear functional or visual purpose and remains consistent with the overall restrained design.

---

# 9. Icons

Use a consistent **Lucide-style outline icon system**.

Icons should be:

* simple
* recognizable
* lightweight
* consistent
* appropriately sized

Prefer one icon style throughout the application.

Do not mix unrelated icon families.

Do not use icons purely for decoration when they do not improve comprehension.

Icons should support the user's understanding of an action or piece of information.

---

# 10. Layout

Use clean, structured layouts based primarily on:

* CSS Grid
* Flexbox
* responsive containers

Maintain clear alignment between related elements.

Prefer a strong visual grid.

Avoid unnecessarily asymmetric layouts unless the design specifically benefits from asymmetry.

Page layouts should provide enough whitespace to prevent visual fatigue while maintaining medium/high information density.

---

# 11. Density and Spacing

The application should have **medium/high information density**.

This is an interview productivity application, not a marketing landing page.

Use:

* efficient spacing
* clear hierarchy
* compact data presentation
* readable typography
* grouped related controls

However, do not make the interface cramped.

Use:

**generous whitespace at the page/layout level**

and

**tighter spacing within related controls and data groups.**

Spacing should communicate relationships between elements.

---

# 12. Cards

Cards should be used when they provide meaningful grouping.

Good uses:

* interview summaries
* performance metrics
* feedback sections
* recent interviews
* progress information
* actionable recommendations

Do not create a card for every piece of information.

Avoid:

> Card inside card inside card

when a simpler layout would communicate the same information.

Cards should generally use:

* white/off-white background
* subtle border
* 8–12px radius
* minimal/no shadow

---

# 13. Buttons

Buttons should have a clear hierarchy.

### Primary

Used for the most important action on a screen.

Examples:

* Start Interview
* Submit Answer
* Continue
* Save

### Secondary

Used for supporting actions.

### Tertiary / Ghost

Used for low-priority actions.

Do not make every button visually prominent.

A screen should generally have one visually dominant primary action.

Buttons should have clear:

* hover state
* focus state
* disabled state
* loading state

---

# 14. Forms

Forms should be simple and professional.

Use:

* clear labels
* readable inputs
* sensible spacing
* visible validation
* clear error messages
* clear primary action

Inputs should have:

* normal state
* hover state where appropriate
* focus state
* error state
* disabled state

Do not rely solely on placeholder text as a label.

---

# 15. Tables and Data

When displaying structured information:

* prioritize readability
* align related data consistently
* use subtle separators
* avoid excessive borders
* keep row density reasonable
* provide clear column hierarchy

Do not make tables visually heavy.

For mobile layouts, tables should become responsive rather than simply overflowing whenever possible.

---

# 16. Charts

Charts should be:

* clean
* minimal
* readable
* information-focused

Prefer:

* thin lines
* restrained fills
* subtle grid lines
* clear labels
* meaningful tooltips

Avoid:

* 3D charts
* excessive colors
* thick lines
* unnecessary chart decoration
* noisy backgrounds
* excessive data labels

Charts should help the candidate understand their performance.

They should not exist merely because a metric can be plotted.

---

# 17. Animation

Use subtle animation.

Preferred duration:

```text
150ms – 250ms
```

Animations should communicate:

* state changes
* navigation
* loading
* interaction feedback
* component appearance

Avoid:

* excessive bouncing
* large motion
* decorative animations
* constantly moving elements
* animations that slow down workflows

Prefer subtle transitions over dramatic animation.

Respect `prefers-reduced-motion` where appropriate.

---

# 18. Responsive Design

The frontend must work reasonably on:

* desktop
* tablet
* mobile

Do not simply shrink the desktop interface until it fits mobile.

Use responsive adaptations where necessary.

Examples:

* collapsible sidebar
* stacked cards
* responsive grids
* mobile-friendly forms
* simplified navigation
* responsive charts
* appropriately sized touch targets

The mobile experience should remain intentional and usable.

---

# 19. Accessibility

Accessibility is part of the design.

Use:

* semantic HTML
* accessible labels
* keyboard navigation
* visible focus states
* appropriate buttons and links
* meaningful alternative text
* sufficient color contrast

Do not use clickable `div`s when a button or link is appropriate.

Do not communicate important information using color alone.

Interactive controls should have clear focus and disabled states.

---

# 20. Loading States

Every API-driven feature should have an appropriate loading state.

Loading states should:

* communicate progress
* preserve layout stability where possible
* avoid unnecessary visual noise

Use skeletons when useful.

Use spinners when a compact loading indicator is more appropriate.

Do not make the entire application visually flash during normal API requests.

---

# 21. Error States

Errors should be clear and actionable.

Do not expose raw backend errors directly to users unless appropriate.

Prefer messages such as:

> We couldn't load your interview history. Please try again.

rather than technical stack traces.

When possible, provide an appropriate recovery action.

---

# 22. Empty States

Empty states should explain:

1. What is currently empty
2. Why the user is seeing the empty state, when useful
3. What the user can do next

Avoid blank screens.

For example, if a user has no interviews:

* explain that no interviews have been completed yet
* provide a clear action such as starting an interview

---

# 23. Dashboard Design

The dashboard should prioritize meaningful information.

Do not create many metric cards simply because metrics exist.

Prioritize:

* interview activity
* performance
* progress
* trends
* actionable insights

Use hierarchy to distinguish:

* important metrics
* supporting information
* historical trends
* recommended actions

The dashboard should answer:

> "How am I performing and what should I do next?"

without requiring the user to inspect every component.

---

# 24. Interview Room Design

The interview room is a high-priority interaction screen.

Prioritize:

* question visibility
* candidate response area
* recording state
* timer/state information
* clear next/submit controls
* minimal distraction

Avoid unnecessary navigation or decorative elements during an active interview.

The interview should feel focused and realistic.

The candidate should always understand:

* what question they are answering
* whether recording is active
* what action they should take next
* how much progress has been made

---

# 25. Feedback Design

Feedback should be understandable rather than merely visually impressive.

Present information such as:

* scores
* explanations
* strengths
* weaknesses
* actionable improvement areas
* relevant trends

Use charts when they improve comprehension.

Do not overwhelm the user by displaying every available metric simultaneously.

Group related feedback logically.

Prioritize actionable information.

---

# 26. Progress and Trends

Progress views should emphasize improvement over time.

Use:

* clean trend charts
* meaningful comparison
* clear labels
* concise summaries

Avoid presenting raw numbers without context.

The user should be able to understand:

* where they improved
* where they declined
* what remains weak
* what deserves attention

---

# 27. Interview Product UX

This is an **AI Interview Preparation Tool**, so the interface should prioritize the candidate's workflow.

Priorities:

1. Candidate clarity
2. Low cognitive load
3. Fast interaction
4. Professional appearance
5. Useful feedback
6. Clear progress
7. Interview realism

The interface should help the candidate focus on interview preparation rather than the interface itself.

Avoid unnecessary interactions.

---

# 28. Visual Inspiration Screenshots

The directory:

```text
frontend/screenshots/
```

contains screenshots collected for visual inspiration.

These screenshots are **not exact implementation specifications**.

Use them to understand:

* layout
* spacing
* hierarchy
* component composition
* interaction patterns
* visual density
* typography relationships
* navigation patterns
* chart presentation
* general visual direction

Do not copy screenshots literally.

Do not reproduce proprietary branding unnecessarily.

Do not import screenshots into the application as runtime assets.

Screenshots are references for design decisions, not assets for the final product.

---

# 29. Screenshot Organization

When possible, organize screenshots by feature:

```text
frontend/
└── screenshots/
    ├── authentication/
    ├── dashboard/
    ├── interview/
    ├── feedback/
    ├── progress/
    ├── resume/
    └── components/
```

However, do not require this structure if the screenshots are currently organized differently.

The important requirement is that screenshots remain easy to identify and associated with the relevant feature.

---

# 30. Missing Design References

Screenshots will not exist for every:

* page
* component
* modal
* loading state
* error state
* empty state
* chart
* interaction

If no relevant screenshot exists, do **not** stop development simply because there is no reference.

Use the design decision hierarchy:

1. Existing frontend patterns
2. Relevant screenshots
3. This design system
4. Sound UI/UX judgment

Make the design decision yourself and keep it consistent with the rest of the product.

---

# 31. Consistency

New frontend features must look like they belong to the same product.

Maintain consistency in:

* typography
* colors
* spacing
* border radius
* buttons
* inputs
* icons
* navigation
* cards
* charts
* loading states
* error states
* empty states

Do not redesign the entire application when implementing a single feature.

If an existing pattern is good, reuse it.

---

# 32. Avoid Overdesign

Do not add visual elements simply because they look impressive.

Avoid:

* unnecessary gradients
* excessive shadows
* excessive rounded corners
* decorative illustrations without purpose
* excessive animations
* unnecessary badges
* excessive icons
* excessive colors
* excessive cards
* visual noise

The product should look sophisticated because it is **restrained and coherent**, not because it contains many effects.

---

# 33. Design Decision Rule

When uncertain about a design decision, ask:

> Does this make the interview-preparation experience clearer, faster, more professional, or easier to use?

If the answer is no, prefer the simpler solution.

The final product should feel:

**professional, calm, modern, focused, information-rich, and trustworthy.**
