/**
 * OrgDelegationManager - Organization Delegation Management Component
 *
 * System admin component for managing AI configuration delegation to organizations.
 * Allows toggling which organizations can customize their prompt configurations.
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  Grid,
  Chip,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import RefreshIcon from "@mui/icons-material/Refresh";
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
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h4" fontWeight="semibold">
              {total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Organizations
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h4" fontWeight="semibold" color="primary">
              {delegated}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Delegation Enabled
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h4" fontWeight="semibold" color="secondary">
              {customized}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              With Custom Config
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
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
    <Card className={className}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Org Icon */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "grey.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BusinessIcon color="action" />
            </Box>

            {/* Org Info */}
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {org.name}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                {org.aiConfigDelegated && (
                  <Chip label="Delegation Enabled" size="small" color="primary" />
                )}
                {org.hasOrgConfig && (
                  <Chip label="Custom Config" size="small" color="secondary" />
                )}
                {!org.aiConfigDelegated && !org.hasOrgConfig && (
                  <Typography variant="caption" color="text.secondary">
                    Using system defaults
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {org.aiConfigDelegated ? "Enabled" : "Disabled"}
            </Typography>
            <Switch
              checked={org.aiConfigDelegated}
              onChange={(e) => onToggle(e.target.checked)}
              disabled={isToggling}
              color="primary"
              title={
                org.aiConfigDelegated
                  ? "Disable AI config delegation"
                  : "Enable AI config delegation"
              }
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
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
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          AI Configuration Delegation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Control which organizations can customize their AI prompt configurations
        </Typography>
      </Box>

      {/* Stats */}
      <DelegationStats {...stats} />

      {/* Info Box */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          About AI Configuration Delegation
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          <Typography component="li" variant="body2">
            <strong>Disabled (default):</strong> Organization uses system-level
            prompt configurations
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Enabled:</strong> Organization can customize prompts, AI
            providers, and models
          </Typography>
          <Typography component="li" variant="body2">
            Disabling delegation does not delete existing org-level configurations
          </Typography>
          <Typography component="li" variant="body2">
            Scoring settings (mode, numerical score) are always customizable by
            org admins
          </Typography>
        </Box>
      </Alert>

      {/* Filters */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search organizations..."
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          size="small"
          value={filterMode}
          exclusive
          onChange={(e, newValue) => newValue && setFilterMode(newValue)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="delegated">Delegated</ToggleButton>
          <ToggleButton value="default">Default</ToggleButton>
        </ToggleButtonGroup>
        {onRefresh && (
          <IconButton
            onClick={onRefresh}
            disabled={isLoading}
            size="small"
            title="Refresh"
            aria-label="Refresh organizations"
          >
            <RefreshIcon />
          </IconButton>
        )}
      </Box>

      {/* Error */}
      {displayError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {displayError}
        </Alert>
      )}

      {/* Loading */}
      {isLoading && orgsArray.length === 0 && (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">
            Loading organizations...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && orgsArray.length === 0 && (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">
            No organizations found.
          </Typography>
        </Box>
      )}

      {/* No Results */}
      {!isLoading && orgsArray.length > 0 && filteredOrgs.length === 0 && (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">
            No organizations match your filter.
          </Typography>
        </Box>
      )}

      {/* Organization List */}
      {filteredOrgs.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredOrgs.map((org) => (
            <OrgDelegationCard
              key={org.id}
              org={org}
              isToggling={togglingId === org.id}
              onToggle={(enabled) => handleToggle(org.id, enabled)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default OrgDelegationManager;
