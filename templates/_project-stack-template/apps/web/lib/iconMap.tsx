import { ReactNode } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import ShieldIcon from "@mui/icons-material/Shield";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ChatIcon from "@mui/icons-material/Chat";
import FolderIcon from "@mui/icons-material/Folder";

/**
 * Icon Mapping
 * 
 * Maps string icon names from module configs to actual MUI icon components.
 * Add new icons here as needed for new modules.
 */
export const iconMap: Record<string, ReactNode> = {
  // Core icons
  Dashboard: <DashboardIcon />,
  Shield: <ShieldIcon />,
  SmartToy: <SmartToyIcon />,
  Settings: <SettingsIcon />,
  People: <PeopleIcon />,
  Business: <BusinessIcon />,
  
  // Functional module icons
  WorkspaceIcon: <WorkspacesIcon />,
  Workspaces: <WorkspacesIcon />,
  LibraryBooks: <LibraryBooksIcon />,
  Chat: <ChatIcon />,
  Folder: <FolderIcon />,
};

/**
 * Get icon component from string name
 * Falls back to Dashboard icon if not found
 */
export function getIcon(iconName: string | undefined): ReactNode {
  if (!iconName) return <DashboardIcon />;
  return iconMap[iconName] || <DashboardIcon />;
}
