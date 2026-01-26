/**
 * Module Admin Dashboard Component
 *
 * Admin dashboard for managing CORA modules.
 * Allows administrators to view, enable, disable, and configure modules.
 *
 * @example
 * ```tsx
 * <ModuleAdminDashboard />
 * ```
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  useModuleRegistry,
  type Module,
  type ModuleUpdate,
} from "../hooks/useModuleRegistry";

// =============================================================================
// Types
// =============================================================================

export interface ModuleAdminDashboardProps {
  /** CSS class name for the container */
  className?: string;
  /** Callback when a module is toggled */
  onModuleToggle?: (module: Module, enabled: boolean) => void;
  /** Callback when a module is updated */
  onModuleUpdate?: (module: Module) => void;
  /** Custom card render function */
  renderCard?: (module: Module, actions: ModuleCardActions) => React.ReactNode;
}

export interface ModuleCardActions {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  openConfig: () => void;
}

export interface ModuleCardProps {
  module: Module;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  onConfigure: () => void;
  isProcessing: boolean;
}

// =============================================================================
// Module Card Component
// =============================================================================

function ModuleCard({
  module,
  onEnable,
  onDisable,
  onConfigure,
  isProcessing,
}: ModuleCardProps): React.ReactElement {
  const tierLabels = {
    1: "Tier 1 (No Dependencies)",
    2: "Tier 2 (Depends on Tier 1)",
    3: "Tier 3 (Depends on Tier 1 & 2)",
  };

  return (
    <div
      className={`module-card ${module.isEnabled ? "enabled" : "disabled"} ${
        module.type === "core" ? "core-module" : "functional-module"
      }`}
      data-module={module.name}
    >
      <div className="module-card-header">
        <div className="module-card-title">
          <h3>{module.displayName}</h3>
          <span className={`module-type-badge ${module.type}`}>
            {module.type}
          </span>
        </div>
        <div className="module-card-status">
          <span
            className={`status-indicator ${
              module.isEnabled ? "active" : "inactive"
            }`}
          />
          <span className="status-text">
            {module.isEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      <div className="module-card-body">
        <p className="module-description">
          {module.description || "No description available."}
        </p>

        <div className="module-meta">
          <div className="meta-item">
            <span className="meta-label">Module Name:</span>
            <code className="meta-value">{module.name}</code>
          </div>
          <div className="meta-item">
            <span className="meta-label">Tier:</span>
            <span className="meta-value">{tierLabels[module.tier]}</span>
          </div>
          {module.version && (
            <div className="meta-item">
              <span className="meta-label">Version:</span>
              <span className="meta-value">{module.version}</span>
            </div>
          )}
          {module.dependencies.length > 0 && (
            <div className="meta-item">
              <span className="meta-label">Dependencies:</span>
              <span className="meta-value">
                {module.dependencies.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="module-card-footer">
        <button
          className="module-btn configure"
          onClick={onConfigure}
          disabled={isProcessing}
        >
          Configure
        </button>
        {module.isEnabled ? (
          <button
            className="module-btn disable"
            onClick={onDisable}
            disabled={isProcessing || module.type === "core"}
            title={
              module.type === "core"
                ? "Core modules cannot be disabled"
                : "Disable module"
            }
          >
            {isProcessing ? "Processing..." : "Disable"}
          </button>
        ) : (
          <button
            className="module-btn enable"
            onClick={onEnable}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Enable"}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Module Config Modal Component
// =============================================================================

interface ModuleConfigModalProps {
  module: Module;
  onClose: () => void;
  onSave: (updates: Partial<ModuleUpdate>) => Promise<void>;
}

function ModuleConfigModal({
  module,
  onClose,
  onSave,
}: ModuleConfigModalProps): React.ReactElement {
  const [config, setConfig] = useState(JSON.stringify(module.config, null, 2));
  const [featureFlags, setFeatureFlags] = useState(
    JSON.stringify(module.featureFlags, null, 2)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updates: Partial<ModuleUpdate> = {
        config: JSON.parse(config),
        featureFlags: JSON.parse(featureFlags),
      };
      await onSave(updates);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="module-config-modal-overlay" onClick={onClose}>
      <div className="module-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configure {module.displayName}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="config-section">
            <label htmlFor="module-config">Module Configuration (JSON)</label>
            <textarea
              id="module-config"
              aria-label="Module Configuration JSON"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              rows={10}
              placeholder="{}"
            />
          </div>

          <div className="config-section">
            <label htmlFor="feature-flags">Feature Flags (JSON)</label>
            <textarea
              id="feature-flags"
              aria-label="Feature Flags JSON"
              value={featureFlags}
              onChange={(e) => setFeatureFlags(e.target.value)}
              rows={6}
              placeholder="{}"
            />
          </div>

          <div className="module-info">
            <h3>Module Information</h3>
            <dl>
              <dt>Name:</dt>
              <dd>{module.name}</dd>
              <dt>Type:</dt>
              <dd>{module.type}</dd>
              <dt>Tier:</dt>
              <dd>{module.tier}</dd>
              <dt>Dependencies:</dt>
              <dd>{module.dependencies.join(", ") || "None"}</dd>
              <dt>Required Permissions:</dt>
              <dd>{module.requiredPermissions.join(", ") || "None"}</dd>
            </dl>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Dashboard Component
// =============================================================================

export function ModuleAdminDashboard({
  className = "",
  onModuleToggle,
  onModuleUpdate,
  renderCard,
}: ModuleAdminDashboardProps): React.ReactElement {
  const {
    modules,
    isLoading,
    error,
    refreshModules,
    enableModule,
    disableModule,
    updateModule,
  } = useModuleRegistry({
    autoFetch: true,
    includeDisabled: true,
  });

  const [processingModules, setProcessingModules] = useState<Set<string>>(
    new Set()
  );
  const [configModule, setConfigModule] = useState<Module | null>(null);
  const [filter, setFilter] = useState<"all" | "core" | "functional">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inject CSS styles on mount
  useEffect(() => {
    const styleId = "module-admin-dashboard-styles";
    
    // Check if styles already injected
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.textContent = moduleAdminDashboardStyles;
      document.head.appendChild(styleElement);
    }

    return () => {
      // Optional: Remove styles on unmount
      // const el = document.getElementById(styleId);
      // if (el) el.remove();
    };
  }, []);

  // Handle enable/disable
  const handleToggleModule = useCallback(
    async (module: Module, enable: boolean) => {
      setProcessingModules((prev) => new Set(prev).add(module.name));

      try {
        const success = enable
          ? await enableModule(module.name)
          : await disableModule(module.name);

        if (success) {
          onModuleToggle?.(module, enable);
        }
      } finally {
        setProcessingModules((prev) => {
          const next = new Set(prev);
          next.delete(module.name);
          return next;
        });
      }
    },
    [enableModule, disableModule, onModuleToggle]
  );

  // Handle configuration save
  const handleSaveConfig = useCallback(
    async (module: Module, updates: Partial<ModuleUpdate>) => {
      const updated = await updateModule(module.name, updates);
      if (updated) {
        onModuleUpdate?.(updated);
      }
    },
    [updateModule, onModuleUpdate]
  );

  // Filter modules
  const filteredModules = (modules || []).filter((m) => {
    if (filter !== "all" && m.type !== filter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(query) ||
        m.displayName.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group modules by tier
  const modulesByTier = {
    1: filteredModules.filter((m) => m.tier === 1),
    2: filteredModules.filter((m) => m.tier === 2),
    3: filteredModules.filter((m) => m.tier === 3),
  };

  if (isLoading) {
    return (
      <div className={`module-admin-dashboard loading ${className}`}>
        <div className="loading-spinner">Loading modules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`module-admin-dashboard error ${className}`}>
        <div className="error-message">
          <h3>Failed to load modules</h3>
          <p>{error}</p>
          <button onClick={refreshModules}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`module-admin-dashboard ${className}`}>
      <header className="dashboard-header">
        <h1>Module Registry</h1>
        <p>Manage CORA modules for your application</p>
      </header>

      <div className="dashboard-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search modules..."
            aria-label="Search modules"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({(modules || []).length})
          </button>
          <button
            className={filter === "core" ? "active" : ""}
            onClick={() => setFilter("core")}
          >
            Core ({(modules || []).filter((m) => m.type === "core").length})
          </button>
          <button
            className={filter === "functional" ? "active" : ""}
            onClick={() => setFilter("functional")}
          >
            Functional ({(modules || []).filter((m) => m.type === "functional").length})
          </button>
        </div>

        <button className="refresh-btn" onClick={refreshModules}>
          Refresh
        </button>
      </div>

      <div className="dashboard-content">
        {[1, 2, 3].map((tier) => {
          const tierModules = modulesByTier[tier as 1 | 2 | 3];
          if (tierModules.length === 0) return null;

          return (
            <section key={tier} className="tier-section">
              <h2>Tier {tier} Modules</h2>
              <div className="module-grid">
                {tierModules.map((module) => {
                  const isProcessing = processingModules.has(module.name);
                  const actions: ModuleCardActions = {
                    enable: () => handleToggleModule(module, true),
                    disable: () => handleToggleModule(module, false),
                    openConfig: () => setConfigModule(module),
                  };

                  if (renderCard) {
                    return (
                      <React.Fragment key={module.name}>
                        {renderCard(module, actions)}
                      </React.Fragment>
                    );
                  }

                  return (
                    <ModuleCard
                      key={module.name}
                      module={module}
                      onEnable={actions.enable}
                      onDisable={actions.disable}
                      onConfigure={actions.openConfig}
                      isProcessing={isProcessing}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {configModule && (
        <ModuleConfigModal
          module={configModule}
          onClose={() => setConfigModule(null)}
          onSave={(updates) => handleSaveConfig(configModule, updates)}
        />
      )}
    </div>
  );
}

// =============================================================================
// CSS Styles
// =============================================================================

export const moduleAdminDashboardStyles = `
.module-admin-dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.dashboard-header p {
  color: #666;
  margin: 0;
}

.dashboard-toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-box input {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  width: 250px;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
}

.filter-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 0.375rem;
  cursor: pointer;
}

.filter-buttons button.active {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  cursor: pointer;
  margin-left: auto;
}

.tier-section {
  margin-bottom: 2rem;
}

.tier-section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eee;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.module-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}

.module-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.module-card.disabled {
  opacity: 0.7;
}

.module-card.core-module {
  border-left: 4px solid #0066cc;
}

.module-card.functional-module {
  border-left: 4px solid #22c55e;
}

.module-card-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #eee;
}

.module-card-title h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.module-type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 9999px;
  text-transform: uppercase;
}

.module-type-badge.core {
  background: #dbeafe;
  color: #1e40af;
}

.module-type-badge.functional {
  background: #dcfce7;
  color: #166534;
}

.module-card-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.active {
  background: #22c55e;
}

.status-indicator.inactive {
  background: #dc2626;
}

.status-text {
  font-size: 0.875rem;
  color: #666;
}

.module-card-body {
  padding: 1rem;
}

.module-description {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: #666;
  line-height: 1.5;
}

.module-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  display: flex;
  font-size: 0.8125rem;
}

.meta-label {
  color: #666;
  width: 100px;
  flex-shrink: 0;
}

.meta-value {
  color: #333;
}

.meta-value code {
  background: #f5f5f5;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.module-card-footer {
  padding: 1rem;
  display: flex;
  gap: 0.75rem;
  border-top: 1px solid #eee;
}

.module-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  flex: 1;
}

.module-btn.configure {
  background: #f5f5f5;
  border: 1px solid #ddd;
  color: #333;
}

.module-btn.enable {
  background: #22c55e;
  border: none;
  color: white;
}

.module-btn.disable {
  background: #dc2626;
  border: none;
  color: white;
}

.module-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Styles */
.module-config-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.module-config-modal {
  background: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-error {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.config-section {
  margin-bottom: 1.5rem;
}

.config-section label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.config-section textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  font-family: monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.module-info {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.375rem;
}

.module-info h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
}

.module-info dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
  font-size: 0.8125rem;
}

.module-info dt {
  color: #666;
}

.module-info dd {
  margin: 0;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
}

.modal-btn.cancel {
  background: #f5f5f5;
  border: 1px solid #ddd;
}

.modal-btn.save {
  background: #0066cc;
  border: none;
  color: white;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner,
.error-message {
  padding: 2rem;
  text-align: center;
}

.error-message h3 {
  color: #dc2626;
}

.error-message button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
`;

export default ModuleAdminDashboard;
