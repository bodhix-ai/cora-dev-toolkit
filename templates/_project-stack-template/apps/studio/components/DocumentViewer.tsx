"use client";

import React from "react";

/**
 * DocumentViewer Component
 *
 * Displays document content via:
 * 1. Presigned URL in an iframe (preferred — preserves original formatting)
 * 2. Plain text fallback (for extracted text content)
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

export default function DocumentViewer({
  documentUrl,
  documentContent,
  documentName,
  onTextSelected,
}: DocumentViewerProps) {
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && onTextSelected) {
      onTextSelected(selection.toString().trim());
    }
  };

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
            style={{
              fontSize: "0.8rem",
              color: "#007bff",
              textDecoration: "none",
            }}
          >
            Open in new tab ↗
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
        {documentUrl ? (
          /* Presigned URL — render in iframe (preserves original formatting) */
          <iframe
            src={documentUrl}
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
          /* Loading / no content */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#999",
            }}
          >
            <p>Loading document...</p>
          </div>
        )}
      </div>
    </div>
  );
}