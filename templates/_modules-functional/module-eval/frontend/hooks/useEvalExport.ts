/**
 * useEvalExport - Export Functionality Hook
 *
 * React hook for exporting evaluations to PDF and XLSX formats.
 * Handles download and loading states.
 */

import { useCallback, useState } from "react";
import { useEvalStore } from "../store";
import type { ExportResponse } from "../types";

// =============================================================================
// EXPORT HOOK
// =============================================================================

/**
 * Hook for exporting evaluations (User)
 */
export function useEvalExport(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null
) {
  const { exportPdf, exportXlsx } = useEvalStore();

  // Track loading and error states
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isXlsxLoading, setIsXlsxLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [xlsxError, setXlsxError] = useState<string | null>(null);

  // Export to PDF
  const downloadPdf = useCallback(async () => {
    if (!token || !workspaceId || !evaluationId) {
      setPdfError("No auth token, workspace ID, or evaluation ID");
      return;
    }

    setIsPdfLoading(true);
    setPdfError(null);

    try {
      await exportPdf(token, workspaceId, evaluationId);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      setPdfError(
        error instanceof Error ? error.message : "Failed to export PDF"
      );
    } finally {
      setIsPdfLoading(false);
    }
  }, [token, workspaceId, evaluationId, exportPdf]);

  // Export to XLSX
  const downloadXlsx = useCallback(async () => {
    if (!token || !workspaceId || !evaluationId) {
      setXlsxError("No auth token, workspace ID, or evaluation ID");
      return;
    }

    setIsXlsxLoading(true);
    setXlsxError(null);

    try {
      await exportXlsx(token, workspaceId, evaluationId);
    } catch (error) {
      console.error("Failed to export XLSX:", error);
      setXlsxError(
        error instanceof Error ? error.message : "Failed to export XLSX"
      );
    } finally {
      setIsXlsxLoading(false);
    }
  }, [token, workspaceId, evaluationId, exportXlsx]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setPdfError(null);
    setXlsxError(null);
  }, []);

  // Is any export loading?
  const isExporting = isPdfLoading || isXlsxLoading;

  // Has any error?
  const hasError = pdfError !== null || xlsxError !== null;

  return {
    downloadPdf,
    downloadXlsx,
    isPdfLoading,
    isXlsxLoading,
    isExporting,
    pdfError,
    xlsxError,
    hasError,
    clearErrors,
  };
}

// =============================================================================
// EXPORT BUTTONS HOOK
// =============================================================================

/**
 * Hook for export button props (convenience wrapper)
 */
export function useExportButtons(
  token: string | null,
  workspaceId: string | null,
  evaluationId: string | null,
  options: { disabled?: boolean } = {}
) {
  const { disabled = false } = options;

  const {
    downloadPdf,
    downloadXlsx,
    isPdfLoading,
    isXlsxLoading,
    pdfError,
    xlsxError,
  } = useEvalExport(token, workspaceId, evaluationId);

  // Props for PDF button
  const pdfButtonProps = {
    onClick: downloadPdf,
    disabled: disabled || isPdfLoading || isXlsxLoading || !evaluationId,
    loading: isPdfLoading,
    error: pdfError,
    label: isPdfLoading ? "Exporting PDF..." : "Export PDF",
    icon: "pdf" as const,
  };

  // Props for XLSX button
  const xlsxButtonProps = {
    onClick: downloadXlsx,
    disabled: disabled || isPdfLoading || isXlsxLoading || !evaluationId,
    loading: isXlsxLoading,
    error: xlsxError,
    label: isXlsxLoading ? "Exporting Excel..." : "Export Excel",
    icon: "xlsx" as const,
  };

  return {
    pdfButtonProps,
    xlsxButtonProps,
    isExporting: isPdfLoading || isXlsxLoading,
  };
}

// =============================================================================
// BULK EXPORT HOOK
// =============================================================================

/**
 * Hook for exporting multiple evaluations
 */
export function useBulkExport(token: string | null, workspaceId: string | null) {
  const { exportPdf, exportXlsx } = useEvalStore();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<Array<{ id: string; error: string }>>([]);

  // Export multiple to PDF
  const exportAllPdf = useCallback(
    async (evaluationIds: string[]) => {
      if (!token || !workspaceId || evaluationIds.length === 0) return;

      setIsExporting(true);
      setProgress(0);
      setErrors([]);

      const total = evaluationIds.length;
      let completed = 0;
      const exportErrors: Array<{ id: string; error: string }> = [];

      for (const evalId of evaluationIds) {
        try {
          await exportPdf(token, workspaceId, evalId);
        } catch (error) {
          exportErrors.push({
            id: evalId,
            error: error instanceof Error ? error.message : "Export failed",
          });
        }
        completed++;
        setProgress(Math.round((completed / total) * 100));
      }

      setErrors(exportErrors);
      setIsExporting(false);
    },
    [token, workspaceId, exportPdf]
  );

  // Export multiple to XLSX
  const exportAllXlsx = useCallback(
    async (evaluationIds: string[]) => {
      if (!token || !workspaceId || evaluationIds.length === 0) return;

      setIsExporting(true);
      setProgress(0);
      setErrors([]);

      const total = evaluationIds.length;
      let completed = 0;
      const exportErrors: Array<{ id: string; error: string }> = [];

      for (const evalId of evaluationIds) {
        try {
          await exportXlsx(token, workspaceId, evalId);
        } catch (error) {
          exportErrors.push({
            id: evalId,
            error: error instanceof Error ? error.message : "Export failed",
          });
        }
        completed++;
        setProgress(Math.round((completed / total) * 100));
      }

      setErrors(exportErrors);
      setIsExporting(false);
    },
    [token, workspaceId, exportXlsx]
  );

  // Clear state
  const reset = useCallback(() => {
    setIsExporting(false);
    setProgress(0);
    setErrors([]);
  }, []);

  return {
    exportAllPdf,
    exportAllXlsx,
    isExporting,
    progress,
    errors,
    hasErrors: errors.length > 0,
    reset,
  };
}
