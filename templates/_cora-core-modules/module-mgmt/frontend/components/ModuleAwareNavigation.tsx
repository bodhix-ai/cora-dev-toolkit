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
 */
export interface ModuleGateProps {
  /** Module name to check */
  moduleName: string;
  /** Children to render if module is enabled */
  children: React.ReactNode;
  /** Fallback to render if module is disabled */
  fallback?: React.ReactNode;
}

export function ModuleGate({
  moduleName,
  children,
  fallback = null,
}: ModuleGateProps): React.ReactElement | null {
  const { modules, isLoading } = useModuleRegistry({ autoFetch: true });

  const isEnabled = useMemo(() => {
    const module = modules.find((m) => m.name === moduleName);
    return module?.isEnabled ?? false;
  }, [modules, moduleName]);

  if (isLoading) {
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
    return modules.find((m) => m.name === moduleName) || null;
  }, [modules, moduleName]);

  if (isLoading) {
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
