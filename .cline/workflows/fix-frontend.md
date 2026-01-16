# CORA Frontend Fix Workflow

This workflow provides frontend expertise for fixing accessibility and UI compliance issues.

**Use this workflow when:**
- The `cora-toolkit-validation-frontend` skill doesn't activate
- You want guaranteed access to frontend remediation knowledge

## Section 508 Accessibility

### Required Elements
- All images need `alt` text
- Form inputs need associated labels
- Interactive elements need keyboard access
- Color contrast must meet WCAG AA (4.5:1)

### Common Fixes

#### Missing Alt Text
```tsx
// ❌ Bad
<img src="/logo.png" />

// ✅ Good
<img src="/logo.png" alt="Company Logo" />

// ✅ Decorative image
<img src="/decoration.png" alt="" role="presentation" />
```

#### Missing Form Labels
```tsx
// ❌ Bad
<input type="text" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="text" />

// ✅ With aria-label
<input type="text" aria-label="Email address" />
```

#### Icon Buttons
```tsx
// ❌ Bad
<button><Icon name="delete" /></button>

// ✅ Good
<button aria-label="Delete item"><Icon name="delete" /></button>
```

## CORA UI Standards

### AppShell Pattern
- Consistent sidebar navigation
- Organization selector in header
- Breadcrumb navigation
- Responsive layout

### Module Integration
- Use `ModuleLayout` wrapper for all module pages
- Follow card-based admin patterns
- Respect theme context
- Use standard spacing tokens

### Component Hierarchy
```
AppShell
├── Header (with OrgSelector)
├── Sidebar (navigation)
└── Main Content
    └── ModuleLayout
        └── Page Content
```

## Next.js Patterns

### App Router
- Pages in `app/` directory
- Use `page.tsx` for routes
- Use `layout.tsx` for shared layouts

### Server vs Client Components
```tsx
// Server component (default)
export default function Page() {
  return <div>Server rendered</div>;
}

// Client component (when needed)
"use client";
export default function InteractiveComponent() {
  const [state, setState] = useState();
  return <button onClick={() => setState(true)}>Click</button>;
}
```

### When to Use Client Components
- useState, useEffect, or other hooks
- Event handlers (onClick, onChange)
- Browser-only APIs
- Interactive UI elements

## Common Fixes

### Missing Keyboard Navigation
1. Ensure all interactive elements are focusable
2. Add `tabIndex={0}` if needed
3. Handle `onKeyDown` for Enter/Space

### Color Contrast Issues
1. Use design system colors
2. Check with contrast checker tool
3. Avoid light gray on white

### Focus Indicators
1. Never use `outline: none` without alternative
2. Use `:focus-visible` for keyboard-only focus
3. Ensure visible focus ring
