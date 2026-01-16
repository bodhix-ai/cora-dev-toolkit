/**
 * EvalExportButton - Export Button Component
 *
 * Provides PDF and XLSX export functionality for evaluations.
 * Supports dropdown menu for format selection.
 */

"use client";

import React, { useState } from "react";
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
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

export interface ExportDropdownProps {
  /** Evaluation to export */
  evaluation: Evaluation;
  /** Callback when export is requested */
  onExport: (evaluationId: string, format: ExportFormat) => Promise<void>;
  /** Whether dropdown is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
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
  size = "md",
  className = "",
}: EvalExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isDisabled = disabled || evaluation.status !== "completed";

  const handleExport = async (format: ExportFormat) => {
    if (isDisabled || isExporting) return;

    try {
      setIsExporting(true);
      setExportFormat(format);
      setMenuOpen(false);
      await onExport(evaluation.id, format);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2.5 text-base",
  };

  // Variant classes
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    text: "text-blue-600 hover:bg-blue-50",
  };

  const buttonClasses = `
    relative rounded font-medium transition-colors
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
    ${className}
  `;

  // Single button (no menu)
  if (!showMenu) {
    return (
      <button
        onClick={() => handleExport("pdf")}
        disabled={isDisabled || isExporting}
        className={buttonClasses}
      >
        {isExporting ? "Exporting..." : "Export"}
      </button>
    );
  }

  // Dropdown button
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        disabled={isDisabled || isExporting}
        className={buttonClasses}
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center gap-1">
          {isExporting ? (
            <>Exporting {exportFormat?.toUpperCase()}...</>
          ) : (
            <>
              Export
              <span className="ml-1">▼</span>
            </>
          )}
        </span>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && !isExporting && (
        <div
          className="absolute right-0 z-10 mt-1 w-36 rounded-md border bg-white shadow-lg"
          role="menu"
        >
          <button
            onClick={() => handleExport("pdf")}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            role="menuitem"
          >
            <span>📄</span>
            <span>PDF Report</span>
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            role="menuitem"
          >
            <span>📊</span>
            <span>Excel Sheet</span>
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
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
  /** Custom class name */
  className?: string;
}

/**
 * Group of individual export buttons (PDF + Excel)
 */
export function ExportButtonsGroup({
  evaluation,
  onExport,
  disabled = false,
  className = "",
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
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => handleExport("pdf")}
        disabled={isDisabled || isExporting !== null}
        className={`
          flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium
          text-red-600 hover:bg-red-50
          ${isDisabled || isExporting !== null ? "opacity-50 cursor-not-allowed" : ""}
        `}
        title="Export as PDF"
      >
        <span>📄</span>
        <span>{isExporting === "pdf" ? "Exporting..." : "PDF"}</span>
      </button>

      <button
        onClick={() => handleExport("xlsx")}
        disabled={isDisabled || isExporting !== null}
        className={`
          flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium
          text-green-600 hover:bg-green-50
          ${isDisabled || isExporting !== null ? "opacity-50 cursor-not-allowed" : ""}
        `}
        title="Export as Excel"
      >
        <span>📊</span>
        <span>{isExporting === "xlsx" ? "Exporting..." : "Excel"}</span>
      </button>
    </div>
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
  /** Custom class name */
  className?: string;
}

/**
 * Export status indicator
 */
export function ExportStatus({
  isExporting,
  format,
  className = "",
}: ExportStatusProps) {
  if (!isExporting) return null;

  return (
    <div
      className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}
    >
      <span className="animate-spin">⏳</span>
      <span>
        Generating {format === "pdf" ? "PDF report" : "Excel spreadsheet"}...
      </span>
    </div>
  );
}

// =============================================================================
// EXPORT DROPDOWN (ALTERNATE STYLE)
// =============================================================================

export function ExportDropdown({
  evaluation,
  onExport,
  disabled = false,
  className = "",
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

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <select
        onChange={(e) => {
          const format = e.target.value as ExportFormat;
          if (format) {
            handleExport(format);
            e.target.value = "";
          }
        }}
        disabled={isDisabled || isExporting !== null}
        className={`
          rounded border border-gray-300 px-2 py-1 text-sm
          ${isDisabled || isExporting !== null ? "opacity-50 cursor-not-allowed" : ""}
        `}
        value=""
      >
        <option value="" disabled>
          {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : "Export as..."}
        </option>
        <option value="pdf">PDF Report</option>
        <option value="xlsx">Excel Spreadsheet</option>
      </select>
    </div>
  );
}

export default EvalExportButton;
