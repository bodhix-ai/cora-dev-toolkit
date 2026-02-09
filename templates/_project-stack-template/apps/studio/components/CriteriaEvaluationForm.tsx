import React, { useState } from "react";

/**
 * Criteria Evaluation Form Component
 * 
 * Form for evaluating a single criterion against a document.
 * Dynamically renders fields based on configured response sections.
 */

interface TableColumn {
  name: string;
  type: 'text' | 'number' | 'boolean';
}

interface ResponseSection {
  id: string;
  name: string;
  type: 'number' | 'text' | 'list' | 'boolean' | 'object' | 'table';
  required: boolean;
  description?: string;
  columns?: TableColumn[];
}

interface CriterionEvaluation {
  criteria_item_id: string;
  section_responses: Record<string, any>; // section_id -> value
}

interface CriteriaEvaluationFormProps {
  criterion: {
    id: string;
    criteria_id: string;
    requirement: string;
    description?: string;
  };
  statusOptions?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  responseSections: ResponseSection[];
  initialValue?: CriterionEvaluation;
  selectedText?: string;
  onChange: (evaluation: CriterionEvaluation) => void;
  onBlur?: () => void; // Auto-save trigger on field blur
}

export default function CriteriaEvaluationForm({
  criterion,
  statusOptions,
  responseSections,
  initialValue,
  selectedText,
  onChange,
  onBlur,
}: CriteriaEvaluationFormProps) {
  const [sectionResponses, setSectionResponses] = useState<Record<string, any>>(
    initialValue?.section_responses || {}
  );

  // Update parent when any field changes
  const notifyChange = (newSectionResponses: Record<string, any>) => {
    onChange({
      criteria_item_id: criterion.id,
      section_responses: newSectionResponses,
    });
  };

  const handleSectionChange = (sectionId: string, value: any) => {
    const newSectionResponses = {
      ...sectionResponses,
      [sectionId]: value,
    };
    setSectionResponses(newSectionResponses);
    notifyChange(newSectionResponses);
  };

  // Check if all required fields are filled
  const isComplete = (responseSections || []).every(
    section => !section.required || (sectionResponses[section.id] !== undefined && sectionResponses[section.id] !== '')
  );

  // Render field based on section type
  const renderSectionField = (section: ResponseSection) => {
    const value = sectionResponses[section.id] || '';

    switch (section.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleSectionChange(section.id, parseFloat(e.target.value) || 0)}
            onBlur={onBlur}
            placeholder={section.description || `Enter ${section.name.toLowerCase()}...`}
            required={section.required}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "0.875rem",
              boxSizing: "border-box",
            }}
          />
        );

      case 'text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleSectionChange(section.id, e.target.value)}
            onBlur={onBlur}
            placeholder={section.description || `Enter ${section.name.toLowerCase()}...`}
            required={section.required}
            rows={4}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "0.875rem",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => handleSectionChange(section.id, e.target.checked)}
            onBlur={onBlur}
            style={{
              width: "1.25rem",
              height: "1.25rem",
              cursor: "pointer",
            }}
          />
        );

      case 'list':
        return (
          <div>
            {(Array.isArray(value) ? value : ['']).map((item: string, idx: number) => (
              <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const arr = Array.isArray(value) ? [...value] : [''];
                    arr[idx] = e.target.value;
                    handleSectionChange(section.id, arr);
                  }}
                  onBlur={onBlur}
                  placeholder={`Item ${idx + 1}`}
                  style={{
                    flex: 1, padding: "0.4rem", border: "1px solid #ccc",
                    borderRadius: "4px", fontSize: "0.875rem", boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const arr = Array.isArray(value) ? value.filter((_: string, i: number) => i !== idx) : [];
                    handleSectionChange(section.id, arr.length > 0 ? arr : ['']);
                  }}
                  style={{ padding: "0.25rem 0.5rem", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", backgroundColor: "#f8f8f8" }}
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const arr = Array.isArray(value) ? [...value, ''] : [''];
                handleSectionChange(section.id, arr);
              }}
              style={{ padding: "0.25rem 0.75rem", border: "1px solid #007bff", borderRadius: "4px", cursor: "pointer", color: "#007bff", backgroundColor: "white", fontSize: "0.75rem", marginTop: "0.25rem" }}
            >+ Add Item</button>
          </div>
        );

      case 'table': {
        const columns = (section.columns && section.columns.length > 0)
          ? section.columns
          : [{ name: 'Column 1', type: 'text' as const }, { name: 'Column 2', type: 'text' as const }];
        const rows: Record<string, any>[] = Array.isArray(value) ? value : [];
        return (
          <div style={{ border: "1px solid #ddd", borderRadius: "4px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#e8edf2" }}>
                  {columns.map((col, ci) => (
                    <th key={ci} style={{ padding: "0.5rem 0.75rem", borderBottom: "2px solid #bbb", textAlign: "left", fontWeight: "700", fontSize: "0.875rem", color: "#333" }}>
                      {col.name || `Column ${ci + 1}`}
                    </th>
                  ))}
                  <th style={{ padding: "0.5rem", borderBottom: "2px solid #bbb", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid #eee" }}>
                    {columns.map((col, ci) => (
                      <td key={ci} style={{ padding: "0.25rem" }}>
                        {col.type === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={row[col.name] === true}
                            onChange={(e) => {
                              const newRows = [...rows];
                              newRows[ri] = { ...newRows[ri], [col.name]: e.target.checked };
                              handleSectionChange(section.id, newRows);
                            }}
                            onBlur={onBlur}
                          />
                        ) : (
                          <input
                            type={col.type === 'number' ? 'number' : 'text'}
                            value={row[col.name] || ''}
                            onChange={(e) => {
                              const newRows = [...rows];
                              newRows[ri] = { ...newRows[ri], [col.name]: col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value };
                              handleSectionChange(section.id, newRows);
                            }}
                            onBlur={onBlur}
                            placeholder={col.name || `Column ${ci + 1}`}
                            style={{ width: "100%", padding: "0.4rem", border: "1px solid #ddd", borderRadius: "3px", boxSizing: "border-box" }}
                          />
                        )}
                      </td>
                    ))}
                    <td style={{ padding: "0.25rem", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          handleSectionChange(section.id, rows.filter((_, i) => i !== ri));
                        }}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#dc3545", fontSize: "1rem" }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ padding: "1rem", textAlign: "center", color: "#999" }}>
                      No rows yet. Click "Add Row" below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => {
                const emptyRow: Record<string, any> = {};
                columns.forEach(col => { emptyRow[col.name] = col.type === 'boolean' ? false : col.type === 'number' ? 0 : ''; });
                handleSectionChange(section.id, [...rows, emptyRow]);
              }}
              style={{ width: "100%", padding: "0.5rem", border: "none", borderTop: "1px solid #ddd", cursor: "pointer", color: "#007bff", backgroundColor: "#f8f9fa", fontSize: "0.875rem" }}
            >+ Add Row</button>
          </div>
        );
      }

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleSectionChange(section.id, e.target.value)}
            onBlur={onBlur}
            placeholder={section.description || `Enter ${section.name.toLowerCase()}...`}
            required={section.required}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "0.875rem",
              boxSizing: "border-box",
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: isComplete ? "#f0f8ff" : "white",
        marginBottom: "1rem",
      }}
    >
      {/* Criterion Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <h4 style={{ margin: 0, fontSize: "1rem" }}>{criterion.criteria_id}</h4>
          {isComplete && (
            <span
              style={{
                padding: "0.125rem 0.5rem",
                backgroundColor: "#28a745",
                color: "white",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              ✓ EVALUATED
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#666" }}>
          {criterion.requirement}
        </p>
        {criterion.description && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#999" }}>
            {criterion.description}
          </p>
        )}
      </div>

      {/* Dynamic Response Section Fields */}
      {(responseSections || []).map((section) => (
        <div key={section.id} style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
            {section.name} {section.required && '*'}
          </label>
          {section.description && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#666" }}>
              {section.description}
            </p>
          )}
          {renderSectionField(section)}
        </div>
      ))}

      {/* Selected Text Helper (for citations) */}
      {selectedText && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#fff3cd",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          <strong>Selected Text:</strong> "{selectedText.substring(0, 100)}{selectedText.length > 100 ? "..." : ""}"
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#666" }}>
            Copy this text to cite it in your response sections above.
          </p>
        </div>
      )}
    </div>
  );
}