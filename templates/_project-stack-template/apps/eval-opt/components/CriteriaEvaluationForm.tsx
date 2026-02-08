import React, { useState } from "react";

/**
 * Criteria Evaluation Form Component
 * 
 * Form for evaluating a single criterion against a document.
 * Dynamically renders fields based on configured response sections.
 */

interface ResponseSection {
  id: string;
  name: string;
  type: 'number' | 'text' | 'list' | 'boolean' | 'object';
  required: boolean;
  description?: string;
}

interface CriterionEvaluation {
  criteria_item_id: string;
  status_id: string;
  section_responses: Record<string, any>; // section_id -> value
}

interface CriteriaEvaluationFormProps {
  criterion: {
    id: string;
    criteria_id: string;
    requirement: string;
    description?: string;
  };
  statusOptions: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  responseSections: ResponseSection[];
  initialValue?: CriterionEvaluation;
  selectedText?: string;
  onChange: (evaluation: CriterionEvaluation) => void;
}

export default function CriteriaEvaluationForm({
  criterion,
  statusOptions,
  responseSections,
  initialValue,
  selectedText,
  onChange,
}: CriteriaEvaluationFormProps) {
  const [statusId, setStatusId] = useState(initialValue?.status_id || "");
  const [sectionResponses, setSectionResponses] = useState<Record<string, any>>(
    initialValue?.section_responses || {}
  );

  // Update parent when any field changes
  const notifyChange = (
    newStatusId: string,
    newSectionResponses: Record<string, any>
  ) => {
    onChange({
      criteria_item_id: criterion.id,
      status_id: newStatusId,
      section_responses: newSectionResponses,
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatusId = e.target.value;
    setStatusId(newStatusId);
    notifyChange(newStatusId, sectionResponses);
  };

  const handleSectionChange = (sectionId: string, value: any) => {
    const newSectionResponses = {
      ...sectionResponses,
      [sectionId]: value,
    };
    setSectionResponses(newSectionResponses);
    notifyChange(statusId, newSectionResponses);
  };

  // Check if all required fields are filled
  const isComplete = statusId && responseSections.every(
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
            style={{
              width: "1.25rem",
              height: "1.25rem",
              cursor: "pointer",
            }}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleSectionChange(section.id, e.target.value)}
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

      {/* Status Selection */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          Status *
        </label>
        <select
          value={statusId}
          onChange={handleStatusChange}
          required
          style={{
            width: "100%",
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          <option value="">-- Select Status --</option>
          {statusOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic Response Section Fields */}
      {responseSections.map((section) => (
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