/**
 * FilterBar Component
 *
 * Filter and search bar for workspace list with status, favorites, and tag filters.
 */

import React from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Search,
  Clear,
  Star,
  StarBorder,
  ViewModule,
  ViewList,
  FilterList,
} from "@mui/icons-material";
import type { WorkspaceFilters, WorkspaceStatus } from "../types";

export type ViewMode = "grid" | "list";

export interface FilterBarProps {
  /** Current filter values */
  filters: WorkspaceFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: WorkspaceFilters) => void;
  /** Current view mode */
  viewMode?: ViewMode;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Available tags for filtering */
  availableTags?: string[];
  /** Whether to show view mode toggle */
  showViewToggle?: boolean;
  /** Whether filters are loading */
  loading?: boolean;
}

export function FilterBar({
  filters,
  onFiltersChange,
  viewMode = "grid",
  onViewModeChange,
  availableTags = [],
  showViewToggle = true,
  loading = false,
}: FilterBarProps): React.ReactElement {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: event.target.value,
    });
  };

  const handleClearSearch = () => {
    onFiltersChange({
      ...filters,
      search: "",
    });
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    onFiltersChange({
      ...filters,
      status: event.target.value as WorkspaceStatus | "all",
    });
  };

  const handleFavoritesToggle = () => {
    onFiltersChange({
      ...filters,
      favoritesOnly: !filters.favoritesOnly,
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({
      ...filters,
      tags: newTags,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      favoritesOnly: false,
      tags: [],
    });
  };

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode | null
  ) => {
    if (newMode && onViewModeChange) {
      onViewModeChange(newMode);
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.favoritesOnly ||
    filters.tags.length > 0;

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) +
    filters.tags.length;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "stretch", md: "center" },
        gap: 2,
        mb: 3,
      }}
    >
      {/* Search input */}
      <TextField
        value={filters.search}
        onChange={handleSearchChange}
        placeholder="Search workspaces..."
        aria-label="Search workspaces"
        size="small"
        disabled={loading}
        sx={{ minWidth: 250, flex: { md: 1 }, maxWidth: { md: 400 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: filters.search && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClearSearch} edge="end" aria-label="Clear search">
                <Clear fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Status filter */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="status-filter-label">Status</InputLabel>
        <Select
          labelId="status-filter-label"
          value={filters.status}
          onChange={handleStatusChange}
          label="Status"
          disabled={loading}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </Select>
      </FormControl>

      {/* Favorites toggle */}
      <Tooltip title={filters.favoritesOnly ? "Show all" : "Show favorites only"}>
        <IconButton
          onClick={handleFavoritesToggle}
          disabled={loading}
          color={filters.favoritesOnly ? "warning" : "default"}
          aria-label={filters.favoritesOnly ? "Show all workspaces" : "Show favorites only"}
          sx={{
            border: 1,
            borderColor: filters.favoritesOnly ? "warning.main" : "divider",
            borderRadius: 1,
          }}
        >
          {filters.favoritesOnly ? <Star /> : <StarBorder />}
        </IconButton>
      </Tooltip>

      {/* Tag chips (if available) */}
      {availableTags.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, flex: 1 }}>
          {availableTags.slice(0, 5).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant={filters.tags.includes(tag) ? "filled" : "outlined"}
              onClick={() => handleTagToggle(tag)}
              disabled={loading}
              sx={{ cursor: "pointer" }}
            />
          ))}
          {availableTags.length > 5 && (
            <Chip
              label={`+${availableTags.length - 5}`}
              size="small"
              variant="outlined"
              disabled
            />
          )}
        </Box>
      )}

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Tooltip title="Clear all filters">
          <IconButton onClick={handleClearFilters} disabled={loading} aria-label="Clear all filters">
            <Badge badgeContent={activeFilterCount} color="primary">
              <FilterList />
            </Badge>
          </IconButton>
        </Tooltip>
      )}

      {/* View mode toggle */}
      {showViewToggle && onViewModeChange && (
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          disabled={loading}
        >
          <ToggleButton value="grid" aria-label="grid view">
            <ViewModule fontSize="small" />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ViewList fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </Box>
  );
}

export default FilterBar;
