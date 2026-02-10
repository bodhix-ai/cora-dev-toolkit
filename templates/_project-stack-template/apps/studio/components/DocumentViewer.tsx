"use client";

import React, { useEffect, useState } from "react";

/**
 * DocumentViewer Component
 *
 * Displays document content inline:
 * 1. Fetches presigned URL as blob → creates local object URL (avoids S3 Content-Disposition: attachment)
 * 2. Renders PDF/images via <object> tag (preserves formatting, supports browser PDF viewer)
 * 3. Plain text fallback for extracted text content
 *
 * Supports text selection for creating citations.
 */

interface DocumentViewerProps {
  /** Presigned URL for the original document (preferred) */
  documentUrl?: string;
  /** Plain text content fallback */
  documentContent?: string;
  /** Document filename for display */
  documentName: string;
  /** Callback when text is selected (for citation flow) */
  onTextSelected?: (text: string) => void;
}

/** Infer MIME type from filename extension */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    txt: "text/plain",
    html: "text/html",
    htm: "text/html",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeMap[ext] || "application/octet-stream";
}

export default function DocumentViewer({
  documentUrl,
  documentContent,
  documentName,
  onTextSelected,
}: DocumentViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch presigned URL as blob to bypass S3 Content-Disposition: attachment
  useEffect(() => {
    if (!documentUrl) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Route through server-side proxy to bypass S3 CORS and Content-Disposition: attachment
    fetch(`/api/document-proxy?url=${encodeURIComponent(documentUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        // Create blob with correct MIME type (S3 may return generic type)
        const mimeType = getMimeType(documentName);
        const typedBlob = new Blob([blob], { type: mimeType });
        const url = URL.createObjectURL(typedBlob);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("DocumentViewer: Failed to fetch document", err);
        setError(err.message || "Failed to load document");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      // Revoke previous blob URL to prevent memory leaks
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [documentUrl, documentName]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && onTextSelected) {
      onTextSelected(selection.toString().trim());
    }
  };

  const mimeType = getMimeType(documentName);
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #ddd",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #ddd",
          backgroundColor: "#f8f9fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.1rem" }}>📄</span>
          <strong style={{ fontSize: "0.9rem" }}>{documentName}</strong>
        </div>
        {documentUrl && (
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={documentName}
            style={{
              fontSize: "0.8rem",
              color: "#007bff",
              textDecoration: "none",
            }}
          >
            Download ↓
          </a>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {loading ? (
          /* Loading state while fetching blob */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#666",
            }}
          >
            <p>Loading document...</p>
          </div>
        ) : error ? (
          /* Error state */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#dc3545",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontWeight: "bold" }}>Failed to load document</p>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>{error}</p>
            {documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: "1rem", color: "#007bff" }}
              >
                Try opening directly ↗
              </a>
            )}
          </div>
        ) : blobUrl && isPdf ? (
          /* PDF — use object tag with blob URL (bypasses S3 Content-Disposition) */
          <object
            data={blobUrl}
            type="application/pdf"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title={`Document: ${documentName}`}
          >
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p>Your browser cannot display PDFs inline.</p>
              {documentUrl && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007bff" }}
                >
                  Download PDF ↓
                </a>
              )}
            </div>
          </object>
        ) : blobUrl && isImage ? (
          /* Image — render directly */
          <div
            style={{
              height: "100%",
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <img
              src={blobUrl}
              alt={documentName}
              style={{ maxWidth: "100%", height: "auto", objectFit: "contain" }}
            />
          </div>
        ) : blobUrl ? (
          /* Other document types — use iframe with blob URL */
          <iframe
            src={blobUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title={`Document: ${documentName}`}
          />
        ) : documentContent ? (
          /* Plain text fallback */
          <div
            onMouseUp={handleTextSelect}
            style={{
              padding: "1rem",
              height: "100%",
              overflow: "auto",
              lineHeight: "1.6",
              fontSize: "0.9rem",
              cursor: "text",
              whiteSpace: "pre-wrap",
            }}
          >
            {documentContent}
          </div>
        ) : (
          /* No content */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#999",
            }}
          >
            <p>No document content available</p>
          </div>
        )}
      </div>
    </div>
  );
}