/**
 * CriteriaImportDialog - Criteria Set Import from Spreadsheet
 *
 * Dialog component for importing criteria items from CSV/XLSX files.
 * Includes file selection, preview, and import progress.
 */

"use client";

import React, { useState, useRef } from "react";
import type {
  EvalDocType,
  ImportCriteriaSetInput,
  ImportCriteriaSetResult,
  ImportError,
} from "../types";

// =============================================================================
// TYPES
// =============================================================================

export interface CriteriaImportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Available document types */
  docTypes: EvalDocType[];
  /** Pre-selected doc type ID */
  defaultDocTypeId?: string;
  /** Whether import is in progress */
  isImporting?: boolean;
  /** Import result (after completion) */
  importResult?: ImportCriteriaSetResult | null;
  /** Callback when import is requested */
  onImport: (input: ImportCriteriaSetInput) => Promise<ImportCriteriaSetResult>;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback after successful import */
  onSuccess?: (result: ImportCriteriaSetResult) => void;
}

export interface FilePreviewProps {
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** File type */
  fileType: "csv" | "xlsx";
  /** Callback to remove file */
  onRemove: () => void;
}

export interface ImportResultDisplayProps {
  /** Import result */
  result: ImportCriteriaSetResult;
  /** Callback to close */
  onClose: () => void;
  /** Callback to import another */
  onImportAnother?: () => void;
}

export interface ImportErrorListProps {
  /** Import errors */
  errors: ImportError[];
  /** Maximum errors to show */
  maxErrors?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:text/csv;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// =============================================================================
// FILE PREVIEW
// =============================================================================

export function FilePreview({
  fileName,
  fileSize,
  fileType,
  onRemove,
}: FilePreviewProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">
          {fileType === "xlsx" ? "📊" : "📄"}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">{fileName}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(fileSize)} • {fileType.toUpperCase()}
          </p>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        title="Remove file"
      >
        ✕
      </button>
    </div>
  );
}

// =============================================================================
// IMPORT ERROR LIST
// =============================================================================

export function ImportErrorList({
  errors,
  maxErrors = 10,
}: ImportErrorListProps) {
  const displayErrors = errors.slice(0, maxErrors);
  const hasMore = errors.length > maxErrors;

  if (errors.length === 0) return null;

  return (
    <div className="mt-3 rounded border border-red-200 bg-red-50 p-3">
      <h4 className="text-sm font-medium text-red-800 mb-2">
        Import Errors ({errors.length})
      </h4>
      <ul className="space-y-1 text-xs text-red-700">
        {displayErrors.map((err, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="font-medium">Row {err.row}:</span>
            <span>{err.error}</span>
            {err.criteriaId && (
              <span className="text-red-500">({err.criteriaId})</span>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
        <p className="mt-2 text-xs text-red-600">
          ... and {errors.length - maxErrors} more errors
        </p>
      )}
    </div>
  );
}

// =============================================================================
// IMPORT RESULT DISPLAY
// =============================================================================

export function ImportResultDisplay({
  result,
  onClose,
  onImportAnother,
}: ImportResultDisplayProps) {
  const hasErrors = result.errorCount > 0;

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <div
        className={`rounded-lg p-4 ${
          hasErrors ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{hasErrors ? "⚠️" : "✅"}</span>
          <div>
            <h3
              className={`font-medium ${
                hasErrors ? "text-yellow-800" : "text-green-800"
              }`}
            >
              {hasErrors
                ? "Import completed with errors"
                : "Import successful!"}
            </h3>
            <p
              className={`text-sm ${
                hasErrors ? "text-yellow-700" : "text-green-700"
              }`}
            >
              Created criteria set: <strong>{result.name}</strong> (v{result.version})
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            {result.totalRows}
          </p>
          <p className="text-xs text-gray-500">Total Rows</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-2xl font-semibold text-green-600">
            {result.successCount}
          </p>
          <p className="text-xs text-gray-500">Imported</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p
            className={`text-2xl font-semibold ${
              result.errorCount > 0 ? "text-red-600" : "text-gray-400"
            }`}
          >
            {result.errorCount}
          </p>
          <p className="text-xs text-gray-500">Errors</p>
        </div>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <ImportErrorList errors={result.errors} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onImportAnother && (
          <button
            onClick={onImportAnother}
            className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Import Another
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// CRITERIA IMPORT DIALOG
// =============================================================================

export function CriteriaImportDialog({
  isOpen,
  docTypes,
  defaultDocTypeId,
  isImporting = false,
  importResult,
  onImport,
  onClose,
  onSuccess,
}: CriteriaImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docTypeId, setDocTypeId] = useState(defaultDocTypeId || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0");
  const [useWeightedScoring, setUseWeightedScoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<ImportCriteriaSetResult | null>(null);

  const activeDocTypes = docTypes.filter((dt) => dt.isActive);
  const result = importResult || localResult;

  const resetForm = () => {
    setDocTypeId(defaultDocTypeId || "");
    setName("");
    setDescription("");
    setVersion("1.0");
    setUseWeightedScoring(false);
    setFile(null);
    setError(null);
    setLocalResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx") {
      setError("Please select a CSV or XLSX file");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Auto-fill name from filename if empty
    if (!name) {
      const baseName = selectedFile.name.replace(/\.(csv|xlsx)$/i, "");
      setName(baseName);
    }
  };

  const handleImport = async () => {
    if (!docTypeId) {
      setError("Please select a document type");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a name");
      return;
    }

    if (!file) {
      setError("Please select a file");
      return;
    }

    try {
      setError(null);
      const ext = file.name.split(".").pop()?.toLowerCase() as "csv" | "xlsx";
      const fileContent = await fileToBase64(file);

      const input: ImportCriteriaSetInput = {
        docTypeId,
        name: name.trim(),
        description: description.trim() || undefined,
        version: version.trim() || undefined,
        useWeightedScoring,
        fileContent,
        fileName: file.name,
        fileType: ext,
      };

      const importRes = await onImport(input);
      setLocalResult(importRes);
      onSuccess?.(importRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const handleImportAnother = () => {
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) handleClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Import Criteria Set
          </h2>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {result ? (
            <ImportResultDisplay
              result={result}
              onClose={handleClose}
              onImportAnother={handleImportAnother}
            />
          ) : (
            <div className="space-y-4">
              {/* File Drop Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spreadsheet File <span className="text-red-500">*</span>
                </label>
                {file ? (
                  <FilePreview
                    fileName={file.name}
                    fileSize={file.size}
                    fileType={
                      file.name.endsWith(".xlsx") ? "xlsx" : "csv"
                    }
                    onRemove={() => setFile(null)}
                  />
                ) : (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-blue-400 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="text-3xl mb-2">📁</span>
                    <p className="text-sm text-gray-600">
                      Click to select or drag & drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      CSV or XLSX, max 5MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="import-file-input"
                  aria-label="Upload spreadsheet file"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Document Type */}
              <div>
                <label
                  htmlFor="import-doctype"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="import-doctype"
                  value={docTypeId}
                  onChange={(e) => setDocTypeId(e.target.value)}
                  disabled={isImporting}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a document type...</option>
                  {activeDocTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="import-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Criteria Set Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="import-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isImporting}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="e.g., NIST 800-53 Controls"
                />
              </div>

              {/* Version & Weighted */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="import-version"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Version
                  </label>
                  <input
                    id="import-version"
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    disabled={isImporting}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="1.0"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input
                    id="import-weighted"
                    type="checkbox"
                    checked={useWeightedScoring}
                    onChange={(e) => setUseWeightedScoring(e.target.checked)}
                    disabled={isImporting}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="import-weighted"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Weighted scoring
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="import-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="import-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isImporting}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Optional description..."
                />
              </div>

              {/* Format Help */}
              <div className="rounded bg-blue-50 p-3 text-xs text-blue-700">
                <strong>Expected columns:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>
                    <code>criteria_id</code> (required) - e.g., "AC-1", "SI-3"
                  </li>
                  <li>
                    <code>requirement</code> (required) - The criteria requirement text
                  </li>
                  <li>
                    <code>description</code> (optional) - Detailed description
                  </li>
                  <li>
                    <code>category</code> (optional) - Category/grouping
                  </li>
                  <li>
                    <code>weight</code> (optional) - Scoring weight (default: 1)
                  </li>
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex items-center justify-end gap-3 border-t p-4">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !file || !docTypeId || !name.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isImporting ? "Importing..." : "Import"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CriteriaImportDialog;
