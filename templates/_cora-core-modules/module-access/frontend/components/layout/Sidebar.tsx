"use client";

import { useState, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import { useOrganizationContext } from "../../hooks/useOrganizationContext";
import { useRole } from "../../hooks/useRole";
import { NavLink } from "./NavLink";
import { ResizeHandle } from "./ResizeHandle";
import { SidebarUserMenu } from "./SidebarUserMenu";
import type { NavigationConfig } from "@${project}/shared-types";

// MUI Icons
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// Constants
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 60;
const MAX_WIDTH = 400;
const COLLAPSED_WIDTH = 60;

interface SidebarProps {
  navigation: NavigationConfig;
}

/**
 * Sidebar Component
 *
 * Left navigation sidebar with:
 * - Expand/collapse functionality
 * - Resizable width
 * - MUI icons
 * - Organization switcher at bottom
 * - User profile section
 * - Dynamic navigation from module composition
 */
export function Sidebar({ navigation }: SidebarProps) {
  const { profile, isAuthenticated } = useUser();
  const { currentOrganization } = useOrganizationContext();
  const { hasPermission } = useRole();
  const [isExpanded, setIsExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load saved preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-restricted-properties -- UI preference storage only, not auth tokens
      const savedExpanded = localStorage.getItem("sidebarExpanded");
      // eslint-disable-next-line no-restricted-properties -- UI preference storage only, not auth tokens
      const savedWidth = localStorage.getItem("sidebarWidth");

      if (savedExpanded !== null) {
        setIsExpanded(savedExpanded === "true");
      }
      if (savedWidth !== null) {
        const width = parseInt(savedWidth, 10);
        setSidebarWidth(width);
      }
    }
  }, []);

  // Persist preferences to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarExpanded", String(isExpanded));

      localStorage.setItem("sidebarWidth", String(sidebarWidth));
    }
  }, [isExpanded, sidebarWidth]);

  // Toggle expand/collapse
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
    if (isExpanded) {
      setSidebarWidth(COLLAPSED_WIDTH);
    } else {
      setSidebarWidth(DEFAULT_WIDTH);
    }
  };

  // Handle width resize
  const handleResize = (newWidth: number) => {
    setSidebarWidth(newWidth);

    // Auto-expand/collapse based on width
    if (newWidth > COLLAPSED_WIDTH + 20 && !isExpanded) {
      setIsExpanded(true);
    } else if (newWidth <= COLLAPSED_WIDTH + 20 && isExpanded) {
      setIsExpanded(false);
    }
  };

  // Sort navigation sections by order
  const sortedNavigation = [...navigation].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 relative transition-all duration-300"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Resize Handle */}
        <ResizeHandle
          onResize={handleResize}
          minWidth={MIN_WIDTH}
          maxWidth={MAX_WIDTH}
          isResizing={isResizing}
          setIsResizing={setIsResizing}
        />

        {/* Collapse/Expand Button */}
        <div className="flex items-center justify-end p-4">
          <button
            onClick={toggleExpanded}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? (
              <ChevronLeftIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </button>
        </div>

        {/* Navigation Links - Flat list without section headers */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {sortedNavigation.flatMap((section) =>
              section.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon as React.ReactNode}
                  label={item.label}
                  isExpanded={isExpanded}
                />
              ))
            )}
          </div>
        </nav>

        {/* Bottom Section - Unified User Menu */}
        <div className="border-t border-gray-200 dark:border-zinc-800 p-3">
          <SidebarUserMenu isExpanded={isExpanded} />
        </div>
      </aside>

      {/* Mobile Menu - Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 shadow-xl flex flex-col">
            {/* Close button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
              <span className="text-sm font-semibold">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeftIcon fontSize="small" />
              </button>
            </div>

            {/* Navigation - Flat list without section headers */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <div className="space-y-1">
                {sortedNavigation.flatMap((section) =>
                  section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={item.icon as React.ReactNode}
                      label={item.label}
                      isExpanded={true}
                    />
                  ))
                )}
              </div>
            </nav>

            {/* Bottom section - Unified User Menu */}
            <div className="border-t border-gray-200 dark:border-zinc-800 p-3">
              <SidebarUserMenu isExpanded={true} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
