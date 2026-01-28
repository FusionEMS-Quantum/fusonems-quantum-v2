"use client";

import React, { useState, useCallback } from "react";
import { EpcrSchema } from "./form-schema";
import {
  FormSectionComponent,
  ValidationErrorsComponent,
  StatusBarComponent,
} from "./components";
import { useOfflineSync, useEpcrForm } from "./hooks";

interface UniversalEpcrFormProps {
  schema: EpcrSchema;
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export const UniversalEpcrForm: React.FC<UniversalEpcrFormProps> = ({ schema, onSubmit, onCancel }) => {
  const { formData, updateField, errors, isDirty, isSaving, saveForm, validateForm } = useEpcrForm({
    variant: schema.variant,
  });
  const { isOnline, pendingCount } = useOfflineSync();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(schema.sections.filter((s) => s.defaultExpanded !== false).map((s) => s.id))
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (!validateForm()) {
      setValidationErrors(["Please fix validation errors before submitting."]);
      return;
    }

    if (onSubmit) {
      try {
        await onSubmit(formData);
      } catch (err) {
        setValidationErrors([String(err)]);
      }
    } else {
      await saveForm();
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
        color: "#f7f6f3",
        minHeight: "100vh",
        padding: "1rem",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <StatusBarComponent isOnline={isOnline} pendingCount={pendingCount} variant={schema.variant} />

      <ValidationErrorsComponent errors={validationErrors} />

      <div style={{ maxWidth: "100%", marginBottom: "2rem" }}>
        {schema.sections.map((section) => (
          <FormSectionComponent
            key={section.id}
            section={section}
            values={formData}
            onChange={updateField}
            errors={{}} // Pass field-level errors from validation
            expanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}

        {/* Shortcuts */}
        {schema.shortcuts && schema.shortcuts.length > 0 && (
          <div
            style={{
              background: "rgba(17, 17, 17, 0.8)",
              border: "1px solid rgba(255, 107, 53, 0.2)",
              padding: "1.5rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ fontSize: "12px", color: "#888", marginBottom: "1rem", fontWeight: 600 }}>
              QUICK ACTIONS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {schema.shortcuts.map((shortcut) => (
                <button
                  key={shortcut.label}
                  onClick={() => {
                    // Apply shortcut fields to form
                    Object.entries(shortcut.fields).forEach(([key, value]) => {
                      updateField(key, value);
                    });
                  }}
                  style={{
                    padding: "10px",
                    background: "rgba(255, 107, 53, 0.1)",
                    border: "1px solid rgba(255, 107, 53, 0.3)",
                    color: "#ff6b35",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 107, 53, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 107, 53, 0.1)";
                  }}
                >
                  + {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "2rem" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "14px",
              background: "transparent",
              border: "1px solid rgba(255, 107, 53, 0.3)",
              color: "#ff6b35",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 107, 53, 0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            ← Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, #ff6b35 0%, #ff4500 100%)",
              border: "none",
              color: "#000",
              fontWeight: 700,
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: "14px",
              opacity: isSaving ? 0.6 : 1,
              transition: "all 0.2s ease",
            }}
          >
            {isSaving ? "Saving..." : "Post ePCR"}
          </button>
        </div>
      </div>
    </div>
  );
};
