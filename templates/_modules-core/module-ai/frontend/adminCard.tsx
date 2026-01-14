import React from "react";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

export const aiEnablementAdminCard: AdminCardConfig = {
  id: "ai-enablement",
  title: "AI Enablement",
  description: "Configure AI providers, discover and validate models, and manage platform AI settings",
  icon: <SmartToyIcon />,
  href: "/admin/ai",
  context: "platform",
  requiredRoles: ["sys_owner", "sys_admin"],
  order: 20,
};
