/**
 * Authentication Provider
 *
 * Wraps the application with NextAuth SessionProvider.
 * This component must be marked as a client component with 'use client' directive.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { AuthProvider } from 'module-access/frontend/components/AuthProvider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>{children}</AuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

"use client";

import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { ReactNode } from "react";

/**
 * AuthProvider component props
 */
interface AuthProviderProps {
  children: ReactNode;
  session?: Session | null;
}

/**
 * Authentication Provider Component
 *
 * Wraps the application with NextAuth's SessionProvider.
 * Provides session context to all child components.
 */
export function AuthProvider({ children, session }: AuthProviderProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
