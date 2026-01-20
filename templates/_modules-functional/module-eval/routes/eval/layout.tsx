/**
 * Evaluation Routes Layout
 * Provides SessionProvider context for eval detail pages
 */

import { SessionProvider } from 'next-auth/react';

export default function EvalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
