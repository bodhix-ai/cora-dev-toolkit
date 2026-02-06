import React, { useState } from "react";

/**
 * Criteria Evaluation Form Component
 * 
 * Form for evaluating a single criterion against a document.
 * Includes status dropdown, confidence slider, explanation textarea,
 * and citations list.
 */

interface Citation {
  text: string;
  timestamp: string;
}

interface CriterionEvaluation {
  criteria_item_id: string;
  status_id: string;
  confidence: number;
  explanation: string;
  citations: string[];
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
  initialValue?: CriterionEvaluation;
  selectedText?: string;
  onChange: (evaluation: CriterionEvaluation) => void;
}

export default function CriteriaEvaluationForm({
  criterion,
  statusOptions,
  initialValue,
  selectedText,
  onChange,
}: CriteriaEvaluationFormProps) {
  const [statusId, setStatusId] = useState(initialValue?.status_id || "");
  const [confidence, setConfidence] = useState(initialValue?.confidence || 50);
  const [explanation, setExplanation] = useState(initialValue?.explanation || "");
  const [citations, setCitations] = useState<string[]>(initialValue?.citations || []);

  // Update parent when any field changes
  const notifyChange = (
    newStatusId: string,
    newConfidence: number,
    newExplanation: string,
    newCitations: string[]
  ) => {
    onChange({
      criteria_item_id: criterion.id,
      status_id: newStatusId,
      confidence: newConfidence,
      explanation: newExplanation,
      citations: newCitations,
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatusId = e.target.value;
    setStatusId(newStatusId);
    notifyChange(newStatusId, confidence, explanation, citations);
  };

  const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfidence = parseInt(e.target.value);
    setConfidence(newConfidence);
    notifyChange(statusId, newConfidence, explanation, citations);
  };

  const handleExplanationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newExplanation = e.target.value;
    setExplanation(newExplanation);
    notifyChange(statusId, confidence, newExplanation, citations);
  };

  const handleAddCitation = () => {
    if (selectedText && selectedText.trim().length > 0) {
      const newCitations = [...citations, selectedText.trim()];
      setCitations(newCitations);
      notifyChange(statusId, confidence, explanation, newCitations);
    }
  };

  const handleRemoveCitation = (index: number) => {
    const newCitations = citations.filter((_, i) => i !== index);
    setCitations(newCitations);
    notifyChange(statusId, confidence, explanation, newCitations);
  };

  const isComplete = statusId && explanation.trim().length > 0;

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

      {/* Confidence Slider */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          Confidence: {confidence}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={confidence}
          onChange={handleConfidenceChange}
          style={{
            width: "100%",
            cursor: "pointer",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#666" }}>
          <span>Not Confident</span>
          <span>Very Confident</span>
        </div>
      </div>

      {/* Explanation */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          Explanation *
        </label>
        <textarea
          value={explanation}
          onChange={handleExplanationChange}
          placeholder="Explain your assessment..."
          required
          rows={3}
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
      </div>

      {/* Citations */}
      <div>
        <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          Citations
        </label>
        
        {selectedText && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#fff3cd",
              borderRadius: "4px",
              marginBottom: "0.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <div style={{ flex: 1, fontSize: "0.875rem" }}>
              "{selectedText.substring(0, 100)}{selectedText.length > 100 ? "..." : ""}"
            </div>
            <button
              type="button"
              onClick={handleAddCitation}
              style={{
                padding: "0.25rem 0.75rem",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.75rem",
                whiteSpace: "nowrap",
              }}
            >
              + Add Citation
            </button>
          </div>
        )}

        {citations.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {citations.map((citation, index) => (
              <div
                key={index}
                style={{
                  padding: "0.5rem",
                  backgroundColor: "#e7f3ff",
                  border: "1px solid #b3d7ff",
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: "0.5rem",
                }}
              >
                <div style={{ flex: 1, fontSize: "0.75rem", fontStyle: "italic" }}>
                  "{citation}"
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCitation(index)}
                  style={{
                    padding: "0.125rem 0.5rem",
                    backgroundColor: "transparent",
                    color: "#dc3545",
                    border: "1px solid #dc3545",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#999", fontStyle: "italic" }}>
            Select text in the document and click "Add Citation" to add supporting quotes
          </p>
        )}
      </div>
    </div>
  );
}