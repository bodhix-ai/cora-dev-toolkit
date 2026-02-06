"use client";

/**
 * System Admin - Module Configuration Page
 * Renders the SysMgmtModulesAdmin component from module-mgmt.
 * 
 * This page follows the standard admin component pattern (01_std_front_ADMIN-COMPONENTS.md):
 * - All admin pages use module-provided components
 * - Component handles auth, loading, and API calls internally
 * - Route metadata documented in component docstring
 */

import { SysMgmtModulesAdmin } from "@{{PROJECT_NAME}}/module-mgmt";

export default function SystemModuleConfigPage() {
  return <SysMgmtModulesAdmin />;
}