"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  isExpanded: boolean;
}

/**
 * NavLink Component
 *
 * Navigation link with active state highlighting and icon support.
 * Adapts to collapsed/expanded sidebar state.
 */
export function NavLink({ href, icon, label, isExpanded }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href as any}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative group
        ${
          isActive
            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
        }
        ${!isExpanded ? "justify-center px-2" : ""}
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400 rounded-r" />
      )}

      {/* Icon */}
      <div
        className={`flex-shrink-0 ${
          isActive ? "text-blue-600 dark:text-blue-400" : ""
        }`}
      >
        {icon}
      </div>

      {/* Label - hidden when collapsed */}
      {isExpanded && (
        <span
          className={`text-sm font-medium truncate ${
            isActive ? "font-semibold" : ""
          }`}
        >
          {label}
        </span>
      )}

      {/* Tooltip for collapsed state */}
      {!isExpanded && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-zinc-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
          {label}
        </div>
      )}
    </Link>
  );
}
