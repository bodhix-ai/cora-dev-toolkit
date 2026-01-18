/**
 * EvalExportButton - Export Button Component
 *
 * Provides PDF and XLSX export functionality for evaluations.
 * Supports dropdown menu for format selection.
 */

"use client";

import React, { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  Box,
  Select,
  FormControl,
  CircularProgress,
  type SelectChangeEvent,
} from "@mui/material";
import type { Evaluation } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type ExportFormat = "pdf" | "xlsx";

export interface EvalExportButtonProps {
  /** Evaluation to export */
  evaluation: Evaluation;
  /** Callback when export is requested */
  onExport: (evaluationId: string, format: ExportFormat) => Promise<void>;
  /** Whether evaluation is exportable (completed) */
  disabled?: boolean;
  /** Show dropdown menu for format selection */
  showMenu?: boolean;
  /** Button variant */
  variant?: "primary" | "secondary" | "text";
  /** Button size */
  size?: "small" | "medium" | "large";
  /** Custom sx prop */
  sx?: object;
}

export interface ExportDropdownProps {
  /** Evaluation to export */
  evaluation: Evaluation;
  /** Callback when export is requested */
  onExport: (evaluationId: string, format: ExportFormat) => Promise<void>;
  /** Whether dropdown is disabled */
  disabled?: boolean;
  /** Custom sx prop */
  sx?: object;
}

// =============================================================================
// SINGLE EXPORT BUTTON
// =============================================================================

export function EvalExportButton({
  evaluation,
  onExport,
  disabled = false,
  showMenu = true,
  variant = "secondary",
  size = "medium",
  sx = {},
}: EvalExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isDisabled = disabled || evaluation.status !== "completed";
  const menuOpen = Boolean(anchorEl);

  const handleExport = async (format: ExportFormat) => {
    if (isDisabled || isExporting) return;

    try {
      setIsExporting(true);
      setExportFormat(format);
      setAnchorEl(null);
      await onExport(evaluation.id, format);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (showMenu) {
      setAnchorEl(event.currentTarget);
    } else {
      handleExport("pdf");
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Map custom variants to MUI variants
  const muiVariant =
    variant === "primary"
      ? "contained"
      : variant === "secondary"
        ? "outlined"
        : "text";

  const muiColor = variant === "primary" ? "primary" : "inherit";

  // Single button (no menu)
  if (!showMenu) {
    return (
      <Button
        onClick={handleClick}
        disabled={isDisabled || isExporting}
        variant={muiVariant}
        color={muiColor}
        size={size}
        sx={sx}
      >
        {isExporting ? "Exporting..." : "Export"}
      </Button>
    );
  }

  // Dropdown button
  return (
    <Box sx={{ display: "inline-block", ...sx }}>
      <Button
        onClick={handleClick}
        disabled={isDisabled || isExporting}
        variant={muiVariant}
        color={muiColor}
        size={size}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        endIcon={!isExporting && "▼"}
      >
        {isExporting
          ? `Exporting ${exportFormat?.toUpperCase()}...`
          : "Export"}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={() => handleExport("pdf")}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span>📄</span>
            <span>PDF Report</span>
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleExport("xlsx")}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span>📊</span>
            <span>Excel Sheet</span>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
}

// =============================================================================
// EXPORT BUTTONS GROUP
// =============================================================================

export interface ExportButtonsGroupProps {
  /** Evaluation to export */
  evaluation: Evaluation;
  /** Callback when export is requested */
  onExport: (evaluationId: string, format: ExportFormat) => Promise<void>;
  /** Whether buttons are disabled */
  disabled?: boolean;
  /** Custom sx prop */
  sx?: object;
}

/**
 * Group of individual export buttons (PDF + Excel)
 */
export function ExportButtonsGroup({
  evaluation,
  onExport,
  disabled = false,
  sx = {},
}: ExportButtonsGroupProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  const isDisabled = disabled || evaluation.status !== "completed";

  const handleExport = async (format: ExportFormat) => {
    if (isDisabled || isExporting) return;

    try {
      setIsExporting(format);
      await onExport(evaluation.id, format);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, ...sx }}>
      <Button
        onClick={() => handleExport("pdf")}
        disabled={isDisabled || isExporting !== null}
        variant="text"
        size="small"
        title="Export as PDF"
        sx={{
          color: "error.main",
          "&:hover": {
            backgroundColor: "error.lighter",
          },
        }}
        startIcon={<span>📄</span>}
      >
        {isExporting === "pdf" ? "Exporting..." : "PDF"}
      </Button>

      <Button
        onClick={() => handleExport("xlsx")}
        disabled={isDisabled || isExporting !== null}
        variant="text"
        size="small"
        title="Export as Excel"
        sx={{
          color: "success.main",
          "&:hover": {
            backgroundColor: "success.lighter",
          },
        }}
        startIcon={<span>📊</span>}
      >
        {isExporting === "xlsx" ? "Exporting..." : "Excel"}
      </Button>
    </Box>
  );
}

// =============================================================================
// EXPORT STATUS INDICATOR
// =============================================================================

export interface ExportStatusProps {
  /** Whether export is in progress */
  isExporting: boolean;
  /** Export format */
  format?: ExportFormat;
  /** Custom sx prop */
  sx?: object;
}

/**
 * Export status indicator
 */
export function ExportStatus({
  isExporting,
  format,
  sx = {},
}: ExportStatusProps) {
  if (!isExporting) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        fontSize: "0.875rem",
        color: "text.secondary",
        ...sx,
      }}
    >
      <CircularProgress size={16} />
      <span>
        Generating {format === "pdf" ? "PDF report" : "Excel spreadsheet"}...
      </span>
    </Box>
  );
}

// =============================================================================
// EXPORT DROPDOWN (ALTERNATE STYLE)
// =============================================================================

export function ExportDropdown({
  evaluation,
  onExport,
  disabled = false,
  sx = {},
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  const isDisabled = disabled || evaluation.status !== "completed";

  const handleExport = async (format: ExportFormat) => {
    if (isDisabled || isExporting) return;

    try {
      setIsExporting(format);
      await onExport(evaluation.id, format);
    } finally {
      setIsExporting(null);
    }
  };

  const handleChange = (event: SelectChangeEvent<string>) => {
    const format = event.target.value as ExportFormat;
    if (format) {
      handleExport(format);
    }
  };

  return (
    <FormControl size="small" sx={{ minWidth: 150, ...sx }}>
      <Select
        value=""
        onChange={handleChange}
        disabled={isDisabled || isExporting !== null}
        displayEmpty
        renderValue={() =>
          isExporting
            ? `Exporting ${isExporting.toUpperCase()}...`
            : "Export as..."
        }
        aria-label="Export Format"
      >
        <MenuItem value="" disabled>
          Export as...
        </MenuItem>
        <MenuItem value="pdf">PDF Report</MenuItem>
        <MenuItem value="xlsx">Excel Spreadsheet</MenuItem>
      </Select>
    </FormControl>
  );
}

export default EvalExportButton;
