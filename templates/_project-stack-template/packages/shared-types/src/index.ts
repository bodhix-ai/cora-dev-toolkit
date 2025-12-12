import type { ReactNode } from "react";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string | number;
  requiredPermissions?: string[];
}

export interface NavSectionConfig {
  id: string;
  label: string;
  order?: number;
  items: NavItemConfig[];
}

export type NavigationConfig = NavSectionConfig[];

export interface AdminCardConfig {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  badge?: string | number;
  requiredPermissions?: string[];
}
