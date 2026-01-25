/**
 * Module Configuration Tab Component
 *
 * Tab component for the Platform Management admin page.
 * Provides a tabbed interface wrapper around ModuleAdminDashboard.
 *
 * This component:
 * - Lists all registered modules from sys_module_registry
 * - Shows core modules with "Always Enabled" badge (no toggle)
 * - Shows functional modules with enable/disable toggle switches
 * - Displays module metadata: display name, description, version, tier
 * - Allows configuration of enabled modules
 *
 * @example
 * ```tsx
 * <ModuleConfigTab />
 * ```
 */

import React from "react";
import { Box } from "@mui/material";
import { ModuleAdminDashboard } from "../ModuleAdminDashboard";

/**
 * Module Configuration Tab
 *
 * Renders the ModuleAdminDashboard within the Platform Management
 * admin page's tabbed interface.
 *
 * Core modules are displayed with a "core" badge and cannot be disabled.
 * Functional modules can be enabled/disabled by sys admins.
 */
export function ModuleConfigTab(): React.ReactElement {
  return (
    <Box sx={{ width: "100%" }}>
      <ModuleAdminDashboard />
    </Box>
  );
}

export default ModuleConfigTab;