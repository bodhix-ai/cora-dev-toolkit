import React from "react";
import { getOrganizationAdminCards } from "@/lib/moduleRegistry";
import OrgAdminClientPage from "./OrgAdminClientPage";

/**
 * Organization Administration Page (Server Component)
 *
 * Loads admin cards server-side and passes to client component.
 * Client component handles authentication and display.
 */
export default function OrgAdminPage() {
  // Load organization admin cards from module registry (server-side)
  const adminCards = getOrganizationAdminCards();

  // Render client component with cards
  return <OrgAdminClientPage adminCards={adminCards} />;
}
