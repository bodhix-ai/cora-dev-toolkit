import { NavigationConfig, NavItemConfig, AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import { getIcon } from "./iconMap";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * Module Registry Loader
 * 
 * Loads module configurations from the merged cora-modules.config.yaml file
 * and builds navigation and admin card configurations dynamically.
 * 
 * This enables modules to be added/removed without changing application code.
 */

interface ModuleConfigNavigation {
  label_singular?: string;
  label_plural?: string;
  icon?: string;
  show_in_main_nav?: boolean;
  nav_priority?: number;
}

interface ModuleConfigAdminCard {
  enabled?: boolean;
  path?: string;
  title?: string;
  description?: string;
  icon?: string;
  priority?: number;
  context?: "platform" | "organization";
}

interface ModuleConfig {
  display_name?: string;
  navigation?: ModuleConfigNavigation;
  admin_card?: ModuleConfigAdminCard;
}

interface MergedModuleConfig {
  [moduleName: string]: ModuleConfig;
}

/**
 * Load and parse the merged module configuration file
 */
function loadModuleConfig(): MergedModuleConfig {
  try {
    const configPath = path.join(process.cwd(), "config", "cora-modules.config.yaml");
    
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      console.warn(`Module config not found at ${configPath}. Using empty config.`);
      return {};
    }
    
    // Read and parse YAML
    const fileContent = fs.readFileSync(configPath, "utf8");
    const config = yaml.load(fileContent) as MergedModuleConfig;
    
    return config || {};
  } catch (error) {
    console.error("Failed to load module config:", error);
    return {};
  }
}

/**
 * Build navigation configuration from module configs
 */
export function buildNavigationConfig(): NavigationConfig {
  const moduleConfig = loadModuleConfig();
  const navItems: NavItemConfig[] = [];
  
  // Always include Dashboard as first item
  navItems.push({
    id: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: getIcon("Dashboard"),
  });
  
  // Add navigation items from modules
  Object.entries(moduleConfig).forEach(([moduleName, config]) => {
    const nav = config.navigation;
    
    // Only include modules that should show in main nav
    if (nav && nav.show_in_main_nav) {
      const moduleId = moduleName.replace("module_", "");
      const label = nav.label_plural || config.display_name || moduleName;
      const href = `/${moduleId}`;
      
      navItems.push({
        id: moduleId,
        label,
        href,
        icon: getIcon(nav.icon),
      });
    }
  });
  
  // Sort by priority (if we add priority to nav config in future)
  // For now, just return in order found
  
  // Wrap in a single section
  const navigationConfig: NavigationConfig = [
    {
      id: "main",
      label: "Main",
      order: 0,
      items: navItems,
    },
  ];
  
  return navigationConfig;
}

/**
 * Build admin card configuration for a specific context
 */
export function buildAdminCards(context: "platform" | "organization"): AdminCardConfig[] {
  const moduleConfig = loadModuleConfig();
  const adminCards: AdminCardConfig[] = [];
  
  Object.entries(moduleConfig).forEach(([moduleName, config]) => {
    const card = config.admin_card;
    
    // Only include enabled cards
    if (!card || !card.enabled) {
      return;
    }
    
    // Check if card matches the requested context
    // If no context specified in config, assume it's for both
    if (card.context && card.context !== context) {
      return;
    }
    
    const moduleId = moduleName.replace("module_", "");
    
    adminCards.push({
      id: moduleId,
      title: card.title || config.display_name || moduleName,
      description: card.description || "",
      icon: getIcon(card.icon),
      href: card.path || `/admin/${moduleId}`,
      context,
      order: card.priority || 999,
    });
  });
  
  // Sort by priority (lower number = higher priority)
  adminCards.sort((a, b) => (a.order || 999) - (b.order || 999));
  
  return adminCards;
}

/**
 * Get platform admin cards
 */
export function getPlatformAdminCards(): AdminCardConfig[] {
  return buildAdminCards("platform");
}

/**
 * Get organization admin cards
 */
export function getOrganizationAdminCards(): AdminCardConfig[] {
  return buildAdminCards("organization");
}
