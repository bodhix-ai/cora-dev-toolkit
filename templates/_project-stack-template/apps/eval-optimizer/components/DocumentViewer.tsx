import React, { useState } from "react";

/**
 * Document Viewer Component
 * 
 * Displays document content with text selection support for creating citations.
 * Users can highlight text to add as citations for their evaluations.
 */

interface DocumentViewerProps {
  documentContent: string;
  documentName: string;
  onTextSelected?: (selectedText: string) => void;
}

export default function DocumentViewer({
  documentContent,
  documentName,
  onTextSelected,
}: DocumentViewerProps) {
  const [selectedText, setSelectedText] = useState("");

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      setSelectedText(text);
      if (onTextSelected) {
        onTextSelected(text);
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "white",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #ddd",
          backgroundColor: "#f8f9fa",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1rem" }}>📄 {documentName}</h3>
        {selectedText && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem",
              backgroundColor: "#fff3cd",
              borderRadius: "4px",
              fontSize: "0.875rem",
            }}
          >
            <strong>Selected:</strong> "{selectedText.substring(0, 100)}
            {selectedText.length > 100 ? "..." : ""}"
          </div>
        )}
      </div>

      {/* Document Content */}
      <div
        onMouseUp={handleTextSelection}
        style={{
          flex: 1,
          padding: "1.5rem",
          overflowY: "auto",
          lineHeight: "1.6",
          fontSize: "1rem",
          userSelect: "text",
          cursor: "text",
        }}
      >
        {documentContent ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{documentContent}</div>
        ) : (
          <div style={{ textAlign: "center", color: "#999", padding: "2rem" }}>
            <p>No document content available</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderTop: "1px solid #ddd",
          backgroundColor: "#f8f9fa",
          fontSize: "0.875rem",
          color: "#666",
        }}
      >
        💡 <strong>Tip:</strong> Select text in the document to add citations to your evaluation
      </div>
    </div>
  );
}