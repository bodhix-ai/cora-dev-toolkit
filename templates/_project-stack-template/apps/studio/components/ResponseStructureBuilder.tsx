import React, { useState } from "react";

/**
 * Response Structure Builder Component
 * 
 * Visual JSON builder for defining the response format that the
 * AI evaluation should produce. Users can add/remove/reorder sections
 * like score_justification, compliance_gaps, recommendations, etc.
 */

interface ResponseSection {
  id: string;
  name: string;
  description: string;
  type: "text" | "list" | "object" | "number" | "boolean";
  required: boolean;
}

interface ResponseStructureBuilderProps {
  initialSections?: ResponseSection[];
  onChange: (sections: ResponseSection[]) => void;
  disabled?: boolean;
}

const DEFAULT_SECTIONS: ResponseSection[] = [
  {
    id: "score_justification",
    name: "Score Justification",
    description: "Explanation for the compliance score given",
    type: "text",
    required: true,
  },
  {
    id: "compliance_gaps",
    name: "Compliance Gaps",
    description: "List of identified compliance gaps or issues",
    type: "list",
    required: false,
  },
  {
    id: "recommendations",
    name: "Recommendations",
    description: "Suggested actions to improve compliance",
    type: "list",
    required: false,
  },
];

// Available field types for adding new sections
const FIELD_TYPES: Array<{ type: ResponseSection["type"]; label: string; description: string }> = [
  { type: "text", label: "Text", description: "Free-form text response" },
  { type: "list", label: "List", description: "Array of items" },
  { type: "object", label: "Object", description: "Structured key-value data" },
  { type: "number", label: "Number", description: "Numeric value" },
  { type: "boolean", label: "Boolean", description: "True/false flag" },
];

export default function ResponseStructureBuilder({
  initialSections,
  onChange,
  disabled = false,
}: ResponseStructureBuilderProps) {
  const [sections, setSections] = useState<ResponseSection[]>(
    initialSections || DEFAULT_SECTIONS
  );
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddSection = (fieldType: ResponseSection["type"]) => {
    // Generate unique ID based on type and count
    const typeCount = sections.filter((s) => s.type === fieldType).length;
    const id = `${fieldType}_field_${typeCount + 1}`;

    const newSection: ResponseSection = {
      id,
      name: "", // User will enter the name
      description: "",
      type: fieldType,
      required: false,
    };
    const newSections = [...sections, newSection];
    setSections(newSections);
    onChange(newSections);
    setShowAddMenu(false);
  };

  const handleRemoveSection = (sectionId: string) => {
    const newSections = sections.filter((s) => s.id !== sectionId);
    setSections(newSections);
    onChange(newSections);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
    onChange(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
    onChange(newSections);
  };

  const handleToggleRequired = (sectionId: string) => {
    const newSections = sections.map((s) =>
      s.id === sectionId ? { ...s, required: !s.required } : s
    );
    setSections(newSections);
    onChange(newSections);
  };

  const handleUpdateDescription = (sectionId: string, description: string) => {
    const newSections = sections.map((s) =>
      s.id === sectionId ? { ...s, description } : s
    );
    setSections(newSections);
    onChange(newSections);
  };

  const handleUpdateName = (sectionId: string, name: string) => {
    const newSections = sections.map((s) =>
      s.id === sectionId ? { ...s, name } : s
    );
    setSections(newSections);
    onChange(newSections);
  };

  const getTypeColor = (type: ResponseSection["type"]): string => {
    switch (type) {
      case "text":
        return "#007bff";
      case "list":
        return "#28a745";
      case "object":
        return "#6610f2";
      case "number":
        return "#fd7e14";
      case "boolean":
        return "#17a2b8";
      default:
        return "#6c757d";
    }
  };

  const generatePreview = (): string => {
    const structure: Record<string, any> = {};
    sections.forEach((section) => {
      // Use the section name as the key (convert to snake_case), or fall back to ID
      const key = section.name 
        ? section.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
        : section.id;
      
      switch (section.type) {
        case "text":
          structure[key] = "...";
          break;
        case "list":
          structure[key] = ["..."];
          break;
        case "object":
          structure[key] = { "...": "..." };
          break;
        case "number":
          structure[key] = 0;
          break;
        case "boolean":
          structure[key] = false;
          break;
      }
    });
    return JSON.stringify(structure, null, 2);
  };


  return (
    <div style={{ display: "flex", gap: "2rem" }}>
      {/* Left: Section List */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Response Sections</h3>
            <p style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}>
              Define what information the AI evaluation should return
            </p>
          </div>
          
          {/* Add Section Button - positioned at top right */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              disabled={disabled}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: disabled ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: disabled ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              + Add Section
            </button>

            {/* Add Menu - Select Field Type */}
            {showAddMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor: "white",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 10,
                  minWidth: "250px",
                }}
              >
                <div style={{ padding: "0.5rem", borderBottom: "1px solid #eee", marginBottom: "0.5rem" }}>
                  <strong style={{ fontSize: "0.875rem" }}>Select Field Type</strong>
                </div>
                {FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    onClick={() => handleAddSection(fieldType.type)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "transparent",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: getTypeColor(fieldType.type),
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        minWidth: "60px",
                        textAlign: "center",
                      }}
                    >
                      {fieldType.label}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "#666" }}>{fieldType.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sections.map((section, index) => (
            <div
              key={section.id}
              style={{
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                backgroundColor: "white",
              }}
            >
              {/* Section Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      padding: "0.125rem 0.5rem",
                      backgroundColor: getTypeColor(section.type),
                      color: "white",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    {section.type}
                  </span>
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => handleUpdateName(section.id, e.target.value)}
                    disabled={disabled}
                    placeholder="Section name..."
                    style={{
                      padding: "0.25rem 0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                      minWidth: "150px",
                    }}
                  />
                  {section.required && (
                    <span style={{ color: "#dc3545", fontSize: "0.875rem" }}>*</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={disabled || index === 0}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "transparent",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: disabled || index === 0 ? "not-allowed" : "pointer",
                      opacity: disabled || index === 0 ? 0.5 : 1,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={disabled || index === sections.length - 1}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "transparent",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: disabled || index === sections.length - 1 ? "not-allowed" : "pointer",
                      opacity: disabled || index === sections.length - 1 ? 0.5 : 1,
                    }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleRemoveSection(section.id)}
                    disabled={disabled}
                    style={{
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "transparent",
                      color: "#dc3545",
                      border: "1px solid #dc3545",
                      borderRadius: "4px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Section Description */}
              <input
                type="text"
                value={section.description}
                onChange={(e) => handleUpdateDescription(section.id, e.target.value)}
                disabled={disabled}
                placeholder="Description..."
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                  boxSizing: "border-box",
                }}
              />

              {/* Section Options */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={section.required}
                    onChange={() => handleToggleRequired(section.id)}
                    disabled={disabled}
                  />
                  Required
                </label>
                <span style={{ fontSize: "0.75rem", color: "#999" }}>
                  JSON Key: <code>{section.name 
                    ? section.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
                    : "(enter name)"}</code>
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Right: Preview */}
      <div style={{ width: "350px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0" }}>JSON Preview</h3>
          <p style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}>
            The AI will return responses in this format
          </p>
        </div>

        <pre
          style={{
            padding: "1rem",
            backgroundColor: "#f8f9fa",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "0.75rem",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
          }}
        >
          {generatePreview()}
        </pre>
      </div>
    </div>
  );
}