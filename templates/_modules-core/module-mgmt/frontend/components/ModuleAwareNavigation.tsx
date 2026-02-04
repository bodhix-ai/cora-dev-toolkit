/**
 * Module-Aware Navigation Component
 *
 * A navigation component that dynamically renders navigation items
 * based on enabled modules in the registry.
 *
 * @example
 * ```tsx
 * <ModuleAwareNavigation
 *   renderItem={(item) => (
 *     <NavLink key={item.moduleName} to={item.route}>
 *       {item.label}
 *     </NavLink>
 *   )}
 * />
 * ```
 */

import React, { useMemo } from "react";
import {
  useModuleNavigation,
  useModuleRegistry,
  type Module,
  type ModuleNavConfig,
} from "../hooks/useModuleRegistry";
import { useOrgModuleConfig } from "../hooks/useOrgModuleConfig";

// =============================================================================
// Types
// =============================================================================

export interface NavItem extends ModuleNavConfig {
  moduleName: string;
}

export interface ModuleAwareNavigationProps {
  /** Custom render function for each navigation item */
  renderItem?: (item: NavItem, index: number) => React.ReactNode;
  /** Filter function to include/exclude items */
  filter?: (item: NavItem) => boolean;
  /** Whether to include admin-only items (default: false) */
  includeAdminItems?: boolean;
  /** Current user's admin status */
  isAdmin?: boolean;
  /** CSS class name for the container */
  className?: string;
  /** Loading placeholder component */
  loadingComponent?: React.ReactNode;
  /** Error placeholder component */
  errorComponent?: React.ReactNode;
  /** Callback when navigation item is clicked */
  onItemClick?: (item: NavItem) => void;
}

// =============================================================================
// Default Render Function
// =============================================================================

const defaultRenderItem = (item: NavItem, index: number): React.ReactNode => {
  return (
    <a
      key={item.moduleName}
      href={item.route}
      className="module-nav-item"
      data-module={item.moduleName}
      aria-label={item.label || `Navigate to ${item.moduleName}`}
    >
      {item.icon && <span className="module-nav-icon">{item.icon}</span>}
      <span className="module-nav-label">{item.label}</span>
    </a>
  );
};

// =============================================================================
// Component
// =============================================================================

export function ModuleAwareNavigation({
  renderItem = defaultRenderItem,
  filter,
  includeAdminItems = false,
  isAdmin = false,
  className = "",
  loadingComponent,
  errorComponent,
  onItemClick,
}: ModuleAwareNavigationProps): React.ReactElement {
  const { navItems, isLoading } = useModuleNavigation();

  // Filter navigation items based on props
  const filteredItems = useMemo(() => {
    let items = navItems;

    // Filter admin items if not admin or not including admin items
    if (!includeAdminItems || !isAdmin) {
      items = items.filter((item) => !item.adminOnly);
    }

    // Apply custom filter
    if (filter) {
      items = items.filter(filter);
    }

    return items;
  }, [navItems, includeAdminItems, isAdmin, filter]);

  // Handle loading state
  if (isLoading) {
    return (
      <nav className={`module-aware-navigation loading ${className}`}>
        {loadingComponent || (
          <div className="module-nav-loading">Loading modules...</div>
        )}
      </nav>
    );
  }

  // Render navigation
  return (
    <nav className={`module-aware-navigation ${className}`}>
      {filteredItems.map((item, index) => {
        const rendered = renderItem(item, index);

        // Wrap with click handler if provided
        if (onItemClick && React.isValidElement(rendered)) {
          return React.cloneElement(rendered as React.ReactElement, {
            onClick: (e: React.MouseEvent) => {
              onItemClick(item);
              // Call original onClick if exists
              const originalOnClick = (
                rendered.props as { onClick?: (e: React.MouseEvent) => void }
              ).onClick;
              if (originalOnClick) {
                originalOnClick(e);
              }
            },
          });
        }

        return rendered;
      })}
    </nav>
  );
}

// =============================================================================
// Utility Components
// =============================================================================

/**
 * Wrapper component that only renders children if the specified module is enabled
 * 
 * When `orgId` is provided, checks org-level enablement (sys → org cascade).
 * When `orgId` is not provided, checks system-level enablement only.
 * 
 * @example
 * ```tsx
 * // System-level check (original behavior)
 * <ModuleGate moduleName="module-eval" fallback={null}>
 *   <EvalPlugin />
 * </ModuleGate>
 * 
 * // Org-level check (new for S4 left nav filtering)
 * <ModuleGate moduleName="module-eval" orgId={currentOrg?.id} fallback={null}>
 *   <EvalNavItem />
 * </ModuleGate>
 * ```
 */
export interface ModuleGateProps {
  /** Module name to check */
  moduleName: string;
  /** Children to render if module is enabled */
  children: React.ReactNode;
  /** Fallback to render if module is disabled */
  fallback?: React.ReactNode;
  /** 
   * Organization ID for org-level enablement check.
   * When provided, checks org-resolved enablement (sys → org cascade).
   * When not provided, checks system-level enablement only.
   */
  orgId?: string | null;
}

export function ModuleGate({
  moduleName,
  children,
  fallback = null,
  orgId,
}: ModuleGateProps): React.ReactElement | null {
  // System-level check (original behavior)
  const { modules: sysModules, isLoading: sysLoading } = useModuleRegistry({ 
    autoFetch: !orgId  // Only fetch if no orgId provided
  });
  
  // Org-level check (new for S4)
  const { modules: orgModules, isLoading: orgLoading } = useOrgModuleConfig({ 
    orgId: orgId || null,
    autoFetch: !!orgId  // Only fetch if orgId provided
  });

  const isEnabled = useMemo(() => {
    // Use org-level check if orgId provided
    if (orgId) {
      if (!orgModules || !Array.isArray(orgModules)) return false;
      const module = orgModules.find((m) => m.name === moduleName);
      return module?.isEnabled ?? false;
    }
    
    // Fall back to system-level check
    if (!sysModules || !Array.isArray(sysModules)) return false;
    const module = sysModules.find((m) => m.name === moduleName);
    return module?.isEnabled ?? false;
  }, [orgId, orgModules, sysModules, moduleName]);

  const isLoading = orgId ? orgLoading : sysLoading;
  const modules = orgId ? orgModules : sysModules;

  if (isLoading || !modules) {
    return null;
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook-like component to conditionally render based on module status
 */
export interface ModuleConditionalProps {
  /** Module name to check */
  moduleName: string;
  /** Render function called with module data */
  render: (module: Module | null, isEnabled: boolean) => React.ReactNode;
}

export function ModuleConditional({
  moduleName,
  render,
}: ModuleConditionalProps): React.ReactElement {
  const { modules, isLoading } = useModuleRegistry({ autoFetch: true });

  const module = useMemo(() => {
    if (!modules || !Array.isArray(modules)) return null;
    return modules.find((m) => m.name === moduleName) || null;
  }, [modules, moduleName]);

  if (isLoading || !modules) {
    return <></>;
  }

  return <>{render(module, module?.isEnabled ?? false)}</>;
}

// =============================================================================
// CSS (can be imported separately or used inline)
// =============================================================================

export const moduleNavigationStyles = `
.module-aware-navigation {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.module-aware-navigation.loading {
  opacity: 0.6;
}

.module-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: inherit;
  border-radius: 0.375rem;
  transition: background-color 0.15s ease;
}

.module-nav-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.module-nav-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-nav-label {
  font-weight: 500;
}

.module-nav-loading {
  padding: 1rem;
  text-align: center;
  color: #666;
}
`;

export default ModuleAwareNavigation;
