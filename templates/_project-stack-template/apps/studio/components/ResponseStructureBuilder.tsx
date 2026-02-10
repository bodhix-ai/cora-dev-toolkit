import React, { useState } from "react";

/**
 * Response Structure Builder Component
 *
 * Defines the AI evaluation response format with:
 * - HEADER fields (score, confidence) — always first, non-removable
 * - BODY sections (orderable mix of built-in + custom):
 *   - Explanation (built-in, with inline [n] citations + references array)
 *   - Custom sections: text, list, table (with user-defined columns), number, boolean
 *
 * The onChange callback emits the ordered body sections.
 */

// --- Types ---

interface TableColumn {
  key: string;
  label: string;
  type: "text" | "number";
}

interface ResponseSection {
  id: string;
  name: string;
  description: string;
  type: "text" | "list" | "table" | "number" | "boolean";
  required: boolean;
  builtIn?: boolean; // true for explanation — cannot be removed
  columns?: TableColumn[]; // only for table type
}

interface ResponseStructureBuilderProps {
  initialSections?: ResponseSection[];
  onChange: (sections: ResponseSection[]) => void;
  disabled?: boolean;
}

// --- Constants ---

/** Header fields — always present at top, not in the orderable body */
const HEADER_FIELDS = [
  {
    id: "score",
    name: "Score",
    description: "Numerical compliance score (0–100)",
    type: "number" as const,
  },
  {
    id: "confidence",
    name: "Confidence",
    description: "AI confidence in the score (0–100)",
    type: "number" as const,
  },
];

/** Default body sections — explanation + citations are built-in (non-removable, orderable) */
const DEFAULT_BODY_SECTIONS: ResponseSection[] = [
  {
    id: "explanation",
    name: "Explanation",
    description:
      "Justification for the score with inline citations using [n] notation",
    type: "text",
    required: true,
    builtIn: true,
  },
  {
    id: "references",
    name: "Citations / References",
    description:
      "Source references from the document — mapped to inline [n] markers in explanation",
    type: "list",
    required: true,
    builtIn: true,
  },
  {
    id: "findings",
    name: "Findings & Recommendations",
    description: "Non-compliance findings with recommended remediation actions",
    type: "table",
    required: false,
    columns: [
      { key: "finding", label: "Finding", type: "text" },
      { key: "severity", label: "Severity", type: "text" },
      { key: "recommendation", label: "Recommendation", type: "text" },
    ],
  },
];

const FIELD_TYPES: Array<{
  type: ResponseSection["type"];
  label: string;
  description: string;
}> = [
  { type: "text", label: "Text", description: "Free-form text response" },
  { type: "list", label: "List", description: "Array of items" },
  {
    type: "table",
    label: "Table",
    description: "Array of rows with defined columns",
  },
  { type: "number", label: "Number", description: "Numeric value" },
  { type: "boolean", label: "Boolean", description: "True/false flag" },
];

// --- Component ---

/** IDs of built-in sections that should always be present and non-removable */
const BUILT_IN_IDS = new Set(
  DEFAULT_BODY_SECTIONS.filter((s) => s.builtIn).map((s) => s.id)
);

/**
 * Merge initialSections from DB with built-in defaults:
 * 1. Re-apply builtIn flag to known built-in IDs
 * 2. Ensure all built-in sections exist (prepend missing ones)
 * 3. Preserve order and custom sections from DB
 */
function mergeWithBuiltIns(
  loaded: ResponseSection[] | undefined
): ResponseSection[] {
  if (!loaded || loaded.length === 0) return DEFAULT_BODY_SECTIONS;

  // Re-apply builtIn flag to any section whose id matches a built-in
  const merged = loaded.map((s) =>
    BUILT_IN_IDS.has(s.id) ? { ...s, builtIn: true, required: true } : s
  );

  // Add any missing built-in sections at the beginning
  const existingIds = new Set(merged.map((s) => s.id));
  const missing = DEFAULT_BODY_SECTIONS.filter(
    (d) => d.builtIn && !existingIds.has(d.id)
  );

  return [...missing, ...merged];
}

export default function ResponseStructureBuilder({
  initialSections,
  onChange,
  disabled = false,
}: ResponseStructureBuilderProps) {
  const [bodySections, setBodySections] = useState<ResponseSection[]>(
    mergeWithBuiltIns(initialSections)
  );
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingColumnsFor, setEditingColumnsFor] = useState<string | null>(
    null
  );

  const update = (newSections: ResponseSection[]) => {
    setBodySections(newSections);
    onChange(newSections);
  };

  // --- Handlers ---

  const handleAddSection = (fieldType: ResponseSection["type"]) => {
    const count = bodySections.filter((s) => s.type === fieldType).length;
    const id = `${fieldType}_field_${count + 1}`;
    const newSection: ResponseSection = {
      id,
      name: "",
      description: "",
      type: fieldType,
      required: false,
      ...(fieldType === "table"
        ? {
            columns: [
              { key: "col_1", label: "Column 1", type: "text" as const },
              { key: "col_2", label: "Column 2", type: "text" as const },
            ],
          }
        : {}),
    };
    // Append new custom sections at the end of the list
    const updated = [...bodySections, newSection];
    update(updated);
    setShowAddMenu(false);
    if (fieldType === "table") {
      setEditingColumnsFor(id);
    }
  };

  const handleRemove = (id: string) => {
    const section = bodySections.find((s) => s.id === id);
    if (section?.builtIn) return;
    update(bodySections.filter((s) => s.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const arr = [...bodySections];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    update(arr);
  };

  const handleMoveDown = (index: number) => {
    if (index === bodySections.length - 1) return;
    const arr = [...bodySections];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    update(arr);
  };

  const handleToggleRequired = (id: string) => {
    update(
      bodySections.map((s) =>
        s.id === id ? { ...s, required: !s.required } : s
      )
    );
  };

  const handleUpdateField = (
    id: string,
    field: "name" | "description",
    value: string
  ) => {
    update(
      bodySections.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // --- Table column handlers ---

  const handleAddColumn = (sectionId: string) => {
    update(
      bodySections.map((s) => {
        if (s.id !== sectionId || !s.columns) return s;
        const n = s.columns.length + 1;
        return {
          ...s,
          columns: [
            ...s.columns,
            {
              key: `col_${n}`,
              label: `Column ${n}`,
              type: "text" as const,
            },
          ],
        };
      })
    );
  };

  const handleRemoveColumn = (sectionId: string, colIndex: number) => {
    update(
      bodySections.map((s) => {
        if (s.id !== sectionId || !s.columns) return s;
        if (s.columns.length <= 2) return s; // minimum 2 columns
        return {
          ...s,
          columns: s.columns.filter((_, i) => i !== colIndex),
        };
      })
    );
  };

  const handleUpdateColumn = (
    sectionId: string,
    colIndex: number,
    field: "label" | "key",
    value: string
  ) => {
    update(
      bodySections.map((s) => {
        if (s.id !== sectionId || !s.columns) return s;
        const cols = [...s.columns];
        cols[colIndex] = { ...cols[colIndex], [field]: value };
        return { ...s, columns: cols };
      })
    );
  };

  // --- Color helper ---

  const getTypeColor = (type: string): string => {
    switch (type) {
      case "text":
        return "#007bff";
      case "list":
        return "#28a745";
      case "table":
        return "#6610f2";
      case "number":
        return "#fd7e14";
      case "boolean":
        return "#17a2b8";
      default:
        return "#6c757d";
    }
  };

  // --- Preview ---

  const generatePreview = (): string => {
    const out: Record<string, unknown> = {};

    // Header fields
    out.score = 85;
    out.confidence = 90;

    // Body sections in order
    bodySections.forEach((s) => {
      const key = s.name
        ? s.name
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
        : s.id;

      if (s.id === "explanation") {
        out[key] =
          "The document addresses encryption [1] but lacks MFA policy [2].";
      } else if (s.id === "references") {
        out[key] = [
          { id: 1, text: "Section 3.2.1: All data encrypted at rest" },
          { id: 2, text: "No MFA requirement found" },
        ];
      } else if (s.type === "text") {
        out[key] = "...";
      } else if (s.type === "list") {
        out[key] = ["..."];
      } else if (s.type === "table" && s.columns) {
        const row: Record<string, string> = {};
        s.columns.forEach((c) => {
          row[c.key] = "...";
        });
        out[key] = [row];
      } else if (s.type === "number") {
        out[key] = 0;
      } else if (s.type === "boolean") {
        out[key] = false;
      }
    });

    return JSON.stringify(out, null, 2);
  };

  // --- Render ---

  return (
    <div style={{ display: "flex", gap: "2rem" }}>
      {/* Left: Section List */}
      <div style={{ flex: 1 }}>
        {/* ─── Header Fields (Score + Confidence) ─── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Header Fields</h3>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#666",
                backgroundColor: "#e9ecef",
                padding: "0.125rem 0.5rem",
                borderRadius: "4px",
              }}
            >
              Always first
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
          >
            {HEADER_FIELDS.map((hf) => (
              <div
                key={hf.id}
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ced4da",
                  borderRadius: "8px",
                  backgroundColor: "#f8f9fa",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.8rem" }}>🔒</span>
                <span
                  style={{
                    padding: "0.125rem 0.4rem",
                    backgroundColor: getTypeColor(hf.type),
                    color: "white",
                    borderRadius: "4px",
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                  }}
                >
                  {hf.type}
                </span>
                <strong style={{ fontSize: "0.85rem" }}>{hf.name}</strong>
                <span style={{ fontSize: "0.75rem", color: "#888" }}>
                  {hf.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Body Sections (orderable) ─── */}
        <div>
          <div
            style={{
              marginBottom: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 0.25rem 0" }}>Body Sections</h3>
              <p
                style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}
              >
                Drag to reorder. Built-in sections can be reordered but not
                removed.
              </p>
            </div>

            {/* Add Section */}
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
                    minWidth: "280px",
                  }}
                >
                  <div
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #eee",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <strong style={{ fontSize: "0.875rem" }}>
                      Select Field Type
                    </strong>
                  </div>
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      onClick={() => handleAddSection(ft.type)}
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
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: getTypeColor(ft.type),
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          minWidth: "60px",
                          textAlign: "center",
                        }}
                      >
                        {ft.label}
                      </span>
                      <span style={{ fontSize: "0.875rem", color: "#666" }}>
                        {ft.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section Cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {bodySections.map((section, index) => (
              <div
                key={section.id}
                style={{
                  padding: "1rem",
                  border: section.builtIn
                    ? "1px solid #b8daff"
                    : "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: section.builtIn ? "#f0f7ff" : "white",
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {section.builtIn && (
                      <span
                        style={{ fontSize: "0.8rem" }}
                        title="Built-in section (cannot be removed)"
                      >
                        📌
                      </span>
                    )}
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
                    {section.builtIn ? (
                      <strong style={{ fontSize: "0.875rem" }}>
                        {section.name}
                      </strong>
                    ) : (
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) =>
                          handleUpdateField(section.id, "name", e.target.value)
                        }
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
                    )}
                    {section.required && (
                      <span style={{ color: "#dc3545", fontSize: "0.875rem" }}>
                        *
                      </span>
                    )}
                  </div>

                  {/* Move / Remove buttons */}
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={disabled || index === 0}
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "transparent",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        cursor:
                          disabled || index === 0 ? "not-allowed" : "pointer",
                        opacity: disabled || index === 0 ? 0.5 : 1,
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={
                        disabled || index === bodySections.length - 1
                      }
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "transparent",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        cursor:
                          disabled || index === bodySections.length - 1
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          disabled || index === bodySections.length - 1
                            ? 0.5
                            : 1,
                      }}
                    >
                      ↓
                    </button>
                    {!section.builtIn && (
                      <button
                        onClick={() => handleRemove(section.id)}
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
                    )}
                  </div>
                </div>

                {/* Description */}
                <input
                  type="text"
                  value={section.description}
                  onChange={(e) =>
                    handleUpdateField(section.id, "description", e.target.value)
                  }
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

                {/* Inline citations hint for explanation and references */}
                {section.id === "explanation" && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "#e8f4fd",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      color: "#004085",
                      marginBottom: "0.5rem",
                    }}
                  >
                    💡 AI embeds inline citations using <code>[n]</code>{" "}
                    notation in this text. Numbers map to entries in the
                    Citations / References section.
                  </div>
                )}
                {section.id === "references" && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "#e8f4fd",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      color: "#004085",
                      marginBottom: "0.5rem",
                    }}
                  >
                    📎 Each entry maps a <code>[n]</code> marker from the
                    Explanation to a specific passage in the source document.
                  </div>
                )}

                {/* Table columns editor */}
                {section.type === "table" && section.columns && (
                  <div
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "6px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <strong style={{ fontSize: "0.8rem" }}>
                        Table Columns
                      </strong>
                      <button
                        onClick={() => handleAddColumn(section.id)}
                        disabled={disabled}
                        style={{
                          padding: "0.2rem 0.5rem",
                          backgroundColor: "#6610f2",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: disabled ? "not-allowed" : "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        + Column
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                      }}
                    >
                      {section.columns.map((col, ci) => (
                        <div
                          key={ci}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) =>
                              handleUpdateColumn(
                                section.id,
                                ci,
                                "label",
                                e.target.value
                              )
                            }
                            disabled={disabled}
                            placeholder="Column label"
                            style={{
                              flex: 1,
                              padding: "0.3rem 0.5rem",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "#888",
                              minWidth: "60px",
                            }}
                          >
                            key:{" "}
                            <code>
                              {col.label
                                ? col.label
                                    .toLowerCase()
                                    .replace(/\s+/g, "_")
                                    .replace(/[^a-z0-9_]/g, "")
                                : col.key}
                            </code>
                          </span>
                          {section.columns!.length > 2 && (
                            <button
                              onClick={() =>
                                handleRemoveColumn(section.id, ci)
                              }
                              disabled={disabled}
                              style={{
                                padding: "0.15rem 0.4rem",
                                backgroundColor: "transparent",
                                color: "#dc3545",
                                border: "1px solid #dc3545",
                                borderRadius: "4px",
                                cursor: disabled ? "not-allowed" : "pointer",
                                fontSize: "0.75rem",
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Options row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  {!section.builtIn && (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.875rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={section.required}
                        onChange={() => handleToggleRequired(section.id)}
                        disabled={disabled}
                      />
                      Required
                    </label>
                  )}
                  <span style={{ fontSize: "0.75rem", color: "#999" }}>
                    JSON Key:{" "}
                    <code>
                      {section.name
                        ? section.name
                            .toLowerCase()
                            .replace(/\s+/g, "_")
                            .replace(/[^a-z0-9_]/g, "")
                        : section.id}
                    </code>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div style={{ width: "380px" }}>
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
            fontSize: "0.7rem",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            maxHeight: "500px",
          }}
        >
          {generatePreview()}
        </pre>

        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#e8f4fd",
            border: "1px solid #b8daff",
            borderRadius: "8px",
            fontSize: "0.8rem",
            color: "#004085",
          }}
        >
          <strong>🔒 Header</strong> (score, confidence) always appears first.
          <br />
          <strong>📌 Explanation</strong> includes inline <code>[n]</code>{" "}
          citations with a <code>references</code> array.
          <br />
          <strong>📊 Tables</strong> produce arrays of row objects with your
          defined columns.
        </div>
      </div>
    </div>
  );
}