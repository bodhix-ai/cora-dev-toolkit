/**
 * OrgDelegationManager - Organization Delegation Management Component
 *
 * System admin component for managing AI configuration delegation to organizations.
 * Allows toggling which organizations can customize their prompt configurations.
 */

"use client";

import React, { useState } from "react";
import type {
  OrgDelegationStatus,
  ToggleDelegationInput,
  DelegationToggleResult,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface OrgDelegationManagerProps {
  /** List of organizations with delegation status */
  organizations: OrgDelegationStatus[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when toggling delegation */
  onToggle: (
    orgId: string,
    input: ToggleDelegationInput
  ) => Promise<DelegationToggleResult>;
  /** Callback to refresh the list */
  onRefresh?: () => void;
  /** Custom class name */
  className?: string;
}

export interface OrgDelegationCardProps {
  /** Organization */
  org: OrgDelegationStatus;
  /** Whether toggle is in progress */
  isToggling?: boolean;
  /** Callback when delegation is toggled */
  onToggle: (enabled: boolean) => void;
  /** Custom class name */
  className?: string;
}

export interface DelegationStatsProps {
  /** Total organizations */
  total: number;
  /** Organizations with delegation enabled */
  delegated: number;
  /** Organizations with custom config */
  customized: number;
}

// =============================================================================
// DELEGATION STATS
// =============================================================================

export function DelegationStats({
  total,
  delegated,
  customized,
}: DelegationStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="rounded-lg border bg-white p-4 text-center">
        <p className="text-2xl font-semibold text-gray-900">{total}</p>
        <p className="text-sm text-gray-500">Total Organizations</p>
      </div>
      <div className="rounded-lg border bg-white p-4 text-center">
        <p className="text-2xl font-semibold text-blue-600">{delegated}</p>
        <p className="text-sm text-gray-500">Delegation Enabled</p>
      </div>
      <div className="rounded-lg border bg-white p-4 text-center">
        <p className="text-2xl font-semibold text-purple-600">{customized}</p>
        <p className="text-sm text-gray-500">With Custom Config</p>
      </div>
    </div>
  );
}

// =============================================================================
// ORG DELEGATION CARD
// =============================================================================

export function OrgDelegationCard({
  org,
  isToggling = false,
  onToggle,
  className = "",
}: OrgDelegationCardProps) {
  return (
    <div
      className={`
        flex items-center justify-between rounded-lg border bg-white p-4
        ${className}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Org Icon */}
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
          🏢
        </div>

        {/* Org Info */}
        <div>
          <h3 className="font-medium text-gray-900">{org.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {org.aiConfigDelegated && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                Delegation Enabled
              </span>
            )}
            {org.hasOrgConfig && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                Custom Config
              </span>
            )}
            {!org.aiConfigDelegated && !org.hasOrgConfig && (
              <span className="text-xs text-gray-500">Using system defaults</span>
            )}
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {org.aiConfigDelegated ? "Enabled" : "Disabled"}
        </span>
        <button
          onClick={() => onToggle(!org.aiConfigDelegated)}
          disabled={isToggling}
          className="relative"
          title={
            org.aiConfigDelegated
              ? "Disable AI config delegation"
              : "Enable AI config delegation"
          }
        >
          <div
            className={`
              w-11 h-6 rounded-full transition-colors
              ${org.aiConfigDelegated ? "bg-blue-600" : "bg-gray-200"}
              ${isToggling ? "opacity-50" : ""}
            `}
          />
          <div
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow
              ${org.aiConfigDelegated ? "translate-x-5" : "translate-x-0"}
            `}
          />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ORG DELEGATION MANAGER
// =============================================================================

export function OrgDelegationManager({
  organizations,
  isLoading = false,
  error,
  onToggle,
  onRefresh,
  className = "",
}: OrgDelegationManagerProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "delegated" | "default">(
    "all"
  );

  // Ensure organizations is always an array (defensive check)
  const orgsArray = Array.isArray(organizations) ? organizations : [];

  // Filter organizations
  const filteredOrgs = orgsArray.filter((org) => {
    const matchesSearch = org.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterMode === "all" ||
      (filterMode === "delegated" && org.aiConfigDelegated) ||
      (filterMode === "default" && !org.aiConfigDelegated);
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: orgsArray.length,
    delegated: orgsArray.filter((o) => o.aiConfigDelegated).length,
    customized: orgsArray.filter((o) => o.hasOrgConfig).length,
  };

  const handleToggle = async (orgId: string, enabled: boolean) => {
    try {
      setTogglingId(orgId);
      setLocalError(null);
      await onToggle(orgId, { aiConfigDelegated: enabled });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to toggle");
    } finally {
      setTogglingId(null);
    }
  };

  const displayError = error || localError;

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          AI Configuration Delegation
        </h2>
        <p className="text-sm text-gray-500">
          Control which organizations can customize their AI prompt configurations
        </p>
      </div>

      {/* Stats */}
      <DelegationStats {...stats} />

      {/* Info Box */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">
          About AI Configuration Delegation
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • <strong>Disabled (default):</strong> Organization uses system-level
            prompt configurations
          </li>
          <li>
            • <strong>Enabled:</strong> Organization can customize prompts, AI
            providers, and models
          </li>
          <li>
            • Disabling delegation does not delete existing org-level configurations
          </li>
          <li>
            • Scoring settings (mode, numerical score) are always customizable by
            org admins
          </li>
        </ul>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="org-search" className="sr-only">
            Search organizations
          </label>
          <input
            id="org-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations..."
            aria-label="Search organizations"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-1 rounded border bg-gray-100 p-0.5">
          <button
            onClick={() => setFilterMode("all")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filterMode === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode("delegated")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filterMode === "delegated"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Delegated
          </button>
          <button
            onClick={() => setFilterMode("default")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filterMode === "default"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Default
          </button>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Error */}
      {displayError && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {displayError}
        </div>
      )}

      {/* Loading */}
      {isLoading && orgsArray.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          Loading organizations...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && orgsArray.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No organizations found.
        </div>
      )}

      {/* No Results */}
      {!isLoading && orgsArray.length > 0 && filteredOrgs.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No organizations match your filter.
        </div>
      )}

      {/* Organization List */}
      {filteredOrgs.length > 0 && (
        <div className="space-y-3">
          {filteredOrgs.map((org) => (
            <OrgDelegationCard
              key={org.id}
              org={org}
              isToggling={togglingId === org.id}
              onToggle={(enabled) => handleToggle(org.id, enabled)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrgDelegationManager;
