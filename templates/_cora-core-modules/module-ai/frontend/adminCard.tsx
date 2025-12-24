import React from "react";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

export const aiEnablementAdminCard: AdminCardConfig = {
  id: "ai-enablement",
  title: "AI Enablement",
  description: "Enable AI providers and models",
  icon: <SmartToyIcon />,
  href: "/admin/ai-providers",
};
