import { AdminCardConfig } from "@sts-career/shared-types";
import SettingsIcon from "@mui/icons-material/Settings";

/**
 * Platform admin card configuration (OPTIONAL)
 *
 * Only create this file if your module provides platform-level administrative features
 * that should appear on the /admin dashboard for super_admin users.
 *
 * For organization-level features, use regular navigation or dashboard cards instead.
 *
 * See: docs/architecture/admin-card-registry-pattern.md
 */
export const moduleTemplateAdminCard: AdminCardConfig = {
  id: "module-template-admin",
  title: "Module Template Admin",
  description: "Platform-level administration for this module",
  icon: <SettingsIcon sx={{ fontSize: 48 }} />,
  href: "/admin/module-template",
  color: "primary.main", // MUI theme color: primary.main, secondary.main, warning.main, etc.
  superAdminOnly: true, // Set to true for super_admin only, false for all admin roles
  order: 50, // Display order: 10-19=org, 20-29=AI/ML, 30-39=performance, 40-49=content, 50+=other
};
