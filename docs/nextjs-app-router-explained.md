# Next.js App Router Explained

## What is App Router?

**App Router** is the new routing system introduced in Next.js 13+ that fundamentally changes how you build Next.js applications. It's a complete reimagining of the routing system built on React Server Components.

## Pages Router vs App Router

### Pages Router (Old - Pre-Next.js 13)

```
pages/
├── index.tsx          # Route: /
├── about.tsx          # Route: /about
├── blog/
│   └── [id].tsx      # Route: /blog/:id
└── _app.tsx          # Root component
```

- File-based routing in `pages/` directory
- All components are Client Components by default
- Uses `getServerSideProps`, `getStaticProps` for data fetching
- Limited layouts system

### App Router (New - Next.js 13+)

```
app/
├── page.tsx              # Route: /
├── layout.tsx            # Root layout (wraps all pages)
├── about/
│   └── page.tsx         # Route: /about
├── blog/
│   ├── [id]/
│   │   └── page.tsx    # Route: /blog/:id
│   └── layout.tsx      # Blog section layout
└── api/
    └── users/
        └── route.ts    # API route: /api/users
```

- File-based routing in `app/` directory
- **Server Components by default** (revolutionary!)
- Nested layouts and templates
- Built-in loading and error states
- Streaming and Suspense support
- Middleware for route protection

## Key Concepts of App Router

### 1. Server Components by Default

**Server Components** render on the server and send only HTML to the client:

```tsx
// This is a Server Component (default in app/)
export default async function BlogPage() {
  // You can fetch data directly in the component!
  const posts = await fetch("https://api.example.com/posts");
  const data = await posts.json();

  return (
    <div>
      {data.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

**Benefits:**

- Zero JavaScript sent to client for static content
- Direct database/API access (no API routes needed)
- Automatic code splitting
- Better SEO

### 2. Client Components (When Needed)

Use `"use client"` directive for interactive components:

```tsx
"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

**When to use Client Components:**

- Event handlers (onClick, onChange, etc.)
- React hooks (useState, useEffect, etc.)
- Browser-only APIs (localStorage, window, etc.)
- Third-party libraries that use hooks

### 3. Nested Layouts

Layouts wrap pages and persist across navigation:

```tsx
// app/layout.tsx (Root layout - required)
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx (Dashboard layout)
export default function DashboardLayout({ children }) {
  return (
    <div>
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### 4. Special Files

- `page.tsx` - Route page (required for route)
- `layout.tsx` - Shared layout
- `loading.tsx` - Loading UI (automatic Suspense boundary)
- `error.tsx` - Error UI (automatic Error boundary)
- `not-found.tsx` - 404 page
- `route.ts` - API route handler

### 5. Data Fetching

**Server Components** can fetch data directly:

```tsx
// No need for getServerSideProps or API routes!
export default async function UserProfile({ params }) {
  const user = await db.user.findUnique({
    where: { id: params.id },
  });

  return <div>{user.name}</div>;
}
```

## Why We Use App Router for STS Career Application

### 1. **Better Performance**

- Server Components reduce JavaScript bundle size by ~40%
- Faster initial page loads
- Automatic code splitting

### 2. **Authentication Integration**

- Middleware runs at the edge for route protection
- Server Components can check auth server-side
- Better security (tokens never exposed to client)

### 3. **Multi-Tenancy Support**

- Nested layouts for organization-specific UI
- Server-side organization context
- Dynamic route segments for org slugs

### 4. **Modern React Patterns**

- Embraces React 18+ features (Suspense, Streaming)
- Future-proof architecture
- Industry standard for new Next.js apps

### 5. **Developer Experience**

- Simplified data fetching
- Better error handling
- Type-safe routing with TypeScript

## Example: Our Authentication Flow with App Router

```tsx
// app/layout.tsx (Server Component)
import { auth } from "@/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";

export default async function RootLayout({ children }) {
  // Fetch session server-side
  const session = await auth();

  return (
    <html>
      <body>
        {/* Pass session to client components */}
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}

// middleware.ts (Runs at edge)
export default auth((req) => {
  if (!req.auth) {
    return Response.redirect(new URL("/api/auth/signin", req.url));
  }
});

// app/dashboard/page.tsx (Server Component)
import { auth } from "@/auth";

export default async function Dashboard() {
  const session = await auth();

  // Fetch user data server-side with token
  const response = await fetch("https://api.example.com/user/profile", {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const user = await response.json();

  return <div>Welcome {user.name}</div>;
}
```

## Migration Path

We didn't migrate - we started fresh with App Router because:

1. **No Legacy Code** - New project, no migration needed
2. **Modern Stack** - Built for React 18+ and Next.js 14+
3. **Best Practices** - Following current Next.js recommendations
4. **Long-term Support** - Pages Router is maintenance mode

## Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
- [Next.js App Router Examples](https://github.com/vercel/next.js/tree/canary/examples)
