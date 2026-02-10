import React, { useState, useRef } from "react";

/**
 * Document Uploader Component
 * 
 * Provides drag-and-drop and file selection UI for uploading documents.
 * Supports:
 * - Drag and drop
 * - File input selection
 * - Multiple file upload
 * - File type validation
 * - Upload progress indicator
 */

interface DocumentUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  acceptedFileTypes?: string;
  maxFileSizeMB?: number;
  multiple?: boolean;
  disabled?: boolean;
}

export default function DocumentUploader({
  onUpload,
  acceptedFileTypes = ".pdf,.doc,.docx,.txt",
  maxFileSizeMB = 10,
  multiple = false,
  disabled = false,
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;

    for (const file of files) {
      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push(`${file.name} exceeds ${maxFileSizeMB}MB limit`);
        continue;
      }

      // Check file type
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (acceptedFileTypes && !acceptedFileTypes.includes(extension)) {
        errors.push(`${file.name} is not a supported file type`);
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    const fileArray = Array.from(files);

    // Validate files
    const { valid, errors } = validateFiles(fileArray);

    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    if (valid.length === 0) {
      setError("No valid files to upload");
      return;
    }

    // Upload files
    setUploading(true);
    try {
      await onUpload(valid);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleClick = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          padding: "3rem 2rem",
          border: `2px dashed ${isDragging ? "#007bff" : "#ccc"}`,
          borderRadius: "8px",
          backgroundColor: isDragging ? "#e7f3ff" : (disabled || uploading ? "#f8f9fa" : "white"),
          textAlign: "center",
          cursor: disabled || uploading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Upload document"
          onChange={handleFileInputChange}
          accept={acceptedFileTypes}
          multiple={multiple}
          disabled={disabled || uploading}
          style={{ display: "none" }}
        />

        {uploading ? (
          <div>
            <div
              style={{
                fontSize: "2rem",
                marginBottom: "1rem",
              }}
            >
              ⏳
            </div>
            <p style={{ margin: 0, color: "#666", fontWeight: "bold" }}>
              Uploading...
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
            >
              📄
            </div>
            <p style={{ margin: 0, marginBottom: "0.5rem", fontWeight: "bold", color: "#333" }}>
              {isDragging ? "Drop files here" : "Drag and drop files here"}
            </p>
            <p style={{ margin: 0, marginBottom: "0.5rem", color: "#666", fontSize: "0.875rem" }}>
              or click to browse
            </p>
            <p style={{ margin: 0, color: "#999", fontSize: "0.75rem" }}>
              Accepted: {acceptedFileTypes} (max {maxFileSizeMB}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}