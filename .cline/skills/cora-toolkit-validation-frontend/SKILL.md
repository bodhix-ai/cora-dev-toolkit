---
name: cora-toolkit-validation-frontend
version: "1.0"
description: Fix CORA frontend accessibility errors (Section 508, WCAG compliance), UI component patterns, and Next.js issues. Activate for "fix accessibility errors", "a11y issue", "UI compliance", "Section 508", or "WCAG".
---

# CORA Toolkit Frontend Expert

✅ **CORA Toolkit Frontend Expert activated** - I'll help fix accessibility, UI compliance, and component issues.

I provide specialized knowledge for fixing CORA frontend issues including accessibility compliance and UI standards.

## Section 508 Accessibility

### Required Elements
- All images need `alt` text
- Form inputs need associated labels
- Interactive elements need keyboard access
- Color contrast must meet WCAG AA (4.5:1)

### Common Fixes

#### Images
```tsx
// Informative image
<img src="/logo.png" alt="Company Logo" />

// Decorative image
<img src="/decoration.png" alt="" role="presentation" />
```

#### Form Labels
```tsx
<label htmlFor="email">Email</label>
<input id="email" type="text" />

// Or with aria-label
<input type="text" aria-label="Email address" />
```

#### Icon Buttons
```tsx
<button aria-label="Delete item">
  <Icon name="delete" />
</button>
```

For complete reference: [CORA Frontend Standard](../../../docs/standards/standard_CORA-FRONTEND.md)

## CORA UI Standards

### AppShell Pattern
- Consistent sidebar navigation
- Organization selector in header
- Breadcrumb navigation

### Module Integration
- Use `ModuleLayout` wrapper
- Follow card-based admin patterns
- Respect theme context

## Cross-Domain Boundary

If a fix requires changes outside my domain (e.g., API changes, database updates):
1. Complete the frontend portion of the fix
2. Document what additional changes are needed
3. Tell the user: "To complete this fix, say 'Fix the [domain] portion'" OR use `/fix-backend.md`, `/fix-data.md`, etc.

I do NOT attempt fixes outside the frontend domain.

## Next.js Patterns

- Use App Router conventions
- Server components by default
- Client components only when needed (`"use client"`)
