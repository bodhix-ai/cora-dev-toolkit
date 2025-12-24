import { NavSectionConfig } from "@{{PROJECT_NAME}}/shared-types";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpIcon from "@mui/icons-material/Help";
import MenuBookIcon from "@mui/icons-material/MenuBook";

/**
 * Organization module main navigation entry point
 *
 * Provides the Dashboard as the primary organization view.
 * Order: 10 (first section)
 */
export const orgNavigation: NavSectionConfig = {
  id: "organization",
  label: "Organization",
  order: 10,
  items: [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: <DashboardIcon fontSize="small" />,
    },
  ],
};

/**
 * Organization utility navigation
 *
 * Provides utility links that should appear at the bottom of the sidebar.
 * Order: 100 (last section)
 */
export const orgUtilityNavigation: NavSectionConfig = {
  id: "utilities",
  label: "Utilities",
  order: 100,
  items: [
    {
      id: "settings",
      label: "Settings",
      href: "/settings",
      icon: <SettingsIcon fontSize="small" />,
    },
    {
      id: "help",
      label: "Help",
      href: "/help",
      icon: <HelpIcon fontSize="small" />,
    },
    {
      id: "docs",
      label: "Documentation",
      href: "/docs",
      icon: <MenuBookIcon fontSize="small" />,
    },
  ],
};
