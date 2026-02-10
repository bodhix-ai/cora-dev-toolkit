import React from "react";
import { getPlatformAdminCards } from "@/lib/moduleRegistry";
import SystemAdminClientPage from "./SystemAdminClientPage";

/**
 * System Administration Page (Server Component)
 *
 * Loads admin cards server-side and passes to client component.
 * Client component handles authentication and display.
 */
export default function SystemAdminPage() {
  // Load platform admin cards from module registry (server-side)
  const adminCards = getPlatformAdminCards();

  // Render client component with cards
  return <SystemAdminClientPage adminCards={adminCards} />;
}
