/**
 * EvalDetailPage - Evaluation Detail Page
 *
 * Detailed view of a single evaluation with:
 * - Document summaries
 * - Criteria results with Q&A format
 * - Citations viewer
 * - Result editing
 * - Export options
 *
 * @example
 * // In Next.js app router: app/(workspace)/[orgSlug]/[wsSlug]/eval/[evalId]/page.tsx
 * import { EvalDetailPage } from '@/modules/module-eval/frontend/pages';
 * export default function Page({ params }: { params: { evalId: string } }) {
 *   return <EvalDetailPage evaluationId={params.evalId} />;
 * }
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Button,
  Paper,
  Skeleton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
  Description as DescriptionIcon,
  PlayArrow as PlayArrowIcon,
  ChevronRight as ChevronRightIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
} from "@mui/icons-material";
import {
  useEvaluation,
  useEvalProgress,
  useEvalExport,
  useActiveStatusOptions,
} from "../hooks";
import {
  EvalProgressCard,
  EvalSummaryPanel,
  EvalQAList,
  CitationViewer,
  ResultEditDialog,
  EvalExportButton,
  ComplianceScoreChip,
} from "../components";
import type { EvalCriteriaResult, Citation, CriteriaResultWithItem, EditResultInput } from "../types";
import { useWorkspacePlugin } from "@{{PROJECT_NAME}}/shared/workspace-plugin";

// =============================================================================
// TYPES
// =============================================================================

export interface EvalDetailPageProps {
  /** Evaluation ID */
  evaluationId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID */
  orgId: string;
  /** Auth token */
  token: string | null;
  /** Optional CSS class */
  className?: string;
  /** Callback to navigate back */
  onBack?: () => void;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Show back button */
  showBackButton?: boolean;
}

type ViewTab = "results" | "citations" | "documents";

// =============================================================================
// TAB NAVIGATION COMPONENT
// =============================================================================

interface TabNavigationProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  resultCount: number;
  citationCount: number;
  documentCount: number;
}

function TabNavigation({
  activeTab,
  onTabChange,
  resultCount,
  citationCount,
  documentCount,
}: TabNavigationProps) {
  const tabs: Array<{ id: ViewTab; label: string; count: number }> = [
    { id: "results", label: "Results", count: resultCount },
    { id: "documents", label: "Documents", count: documentCount },
  ];

  const handleChange = (_event: React.SyntheticEvent, newValue: ViewTab) => {
    onTabChange(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Tabs value={activeTab} onChange={handleChange} aria-label="evaluation tabs">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {tab.label}
                <Chip
                  label={tab.count}
                  size="small"
                  color={activeTab === tab.id ? "primary" : "default"}
                  sx={{ height: 20, fontSize: "0.75rem" }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}

// =============================================================================
// HEADER COMPONENT
// =============================================================================

interface HeaderProps {
  title: string;
  status: string;
  evaluation: any;
  workspaceId?: string;
  workspaceName?: string;
  token: string | null;
  onBack?: () => void;
  showBackButton: boolean;
  onExport: (evaluationId: string, format: "pdf" | "xlsx") => Promise<void>;
  expandAll?: boolean;
  onExpandAllChange?: (expanded: boolean) => void;
}

function Header({
  title,
  status,
  evaluation,
  workspaceId,
  workspaceName: providedWorkspaceName,
  token,
  onBack,
  showBackButton,
  onExport,
  expandAll,
  onExpandAllChange,
}: HeaderProps) {
  const [workspaceName, setWorkspaceName] = useState<string | null>(providedWorkspaceName || null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(!providedWorkspaceName && !!workspaceId);

  // Get workspace config for dynamic labels
  const { navigation } = useWorkspacePlugin();
  const navLabelSingular = navigation.labelSingular;

  const statusColors: Record<string, "warning" | "info" | "success" | "error" | "default"> = {
    draft: "default",
    pending: "warning",
    processing: "info",
    completed: "success",
    failed: "error",
  };

  // Fetch workspace name if we have workspaceId but no workspace name
  useEffect(() => {
    async function fetchWorkspaceName() {
      if (!workspaceId || providedWorkspaceName || !token) return;
      
      setLoadingWorkspace(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_CORA_API_URL;
        const response = await fetch(`${apiUrl}/ws/${workspaceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setWorkspaceName(data.data?.name || data.name || null);
        }
      } catch (err) {
        console.error('Failed to fetch workspace name:', err);
      } finally {
        setLoadingWorkspace(false);
      }
    }
    
    fetchWorkspaceName();
  }, [workspaceId, providedWorkspaceName, token]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Breadcrumbs */}
      {showBackButton && onBack && workspaceId && (
        <Breadcrumbs 
          separator={<ChevronRightIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          <Link
            component="button"
            variant="body2"
            onClick={onBack}
            aria-label={`Return to ${loadingWorkspace ? 'workspace' : (workspaceName || navLabelSingular)}`}
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              cursor: "pointer",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" }
            }}
          >
            {loadingWorkspace ? "Loading..." : (workspaceName || navLabelSingular)}
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={onBack}
            aria-label="Return to evaluations list"
            sx={{ 
              cursor: "pointer",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" }
            }}
          >
            Evaluations
          </Link>
          <Typography variant="body2" color="text.primary">
            {title}
          </Typography>
        </Breadcrumbs>
      )}
      
      {/* Header Content */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Evaluation Results
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                color={statusColors[status] || "default"}
                size="small"
              />
              
              {/* Page-wide Expand/Collapse Controls */}
              {status === "completed" && onExpandAllChange && (
                <Box sx={{ display: "flex", gap: 0.5, ml: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => onExpandAllChange(true)}
                    title="Expand all sections"
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <UnfoldMoreIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onExpandAllChange(false)}
                    title="Collapse all sections"
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <UnfoldLessIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
          {evaluation.complianceScore != null && 
           evaluation.scoreConfig && 
           status === "completed" && (
            <Box>
              <ComplianceScoreChip
                score={evaluation.complianceScore}
                config={{
                  categoricalMode: evaluation.scoreConfig.categoricalMode,
                  showDecimalScore: evaluation.scoreConfig.showDecimalScore,
                }}
                statusOptions={evaluation.scoreConfig.statusOptions}
                size="large"
              />
            </Box>
          )}
        </Box>
        {status === "completed" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EvalExportButton
              evaluation={evaluation}
              onExport={onExport}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// DRAFT CONFIGURATION COMPONENT
// =============================================================================

interface DraftConfigurationProps {
  evaluationId: string;
  evaluationName: string;
  workspaceId: string;
  token: string | null;
  onConfigure: (config: { docTypeId: string; criteriaSetId: string; docIds: string[] }) => Promise<void>;
}

function DraftConfiguration({
  evaluationId,
  evaluationName,
  workspaceId,
  token,
  onConfigure,
}: DraftConfigurationProps) {
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>("");
  const [selectedCriteriaSetId, setSelectedCriteriaSetId] = useState<string>("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Direct API call state - replaces problematic hooks
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Fetch user's current org ID first
  React.useEffect(() => {
    async function fetchUserOrg() {
      if (!token) return;
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_CORA_API_URL;
        
        console.log('[DraftConfig] Fetching user profile from:', apiUrl);
        
        const meRes = await fetch(`${apiUrl}/profiles/me`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!meRes.ok) {
          console.error('[DraftConfig] Failed to fetch user org:', meRes.status);
          return;
        }
        
        const meData = await meRes.json();
        console.log('[DraftConfig] User org response:', meData);
        
        const currentOrgId = meData.data?.currentOrgId || meData.currentOrgId;
        console.log('[DraftConfig] Current org ID:', currentOrgId);
        
        setOrgId(currentOrgId);
      } catch (err) {
        console.error('[DraftConfig] Error fetching user org:', err);
      }
    }
    
    fetchUserOrg();
  }, [token]);

  // Fetch doc types and criteria sets after we have orgId
  React.useEffect(() => {
    async function fetchConfigData() {
      if (!token || !orgId) return;
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_CORA_API_URL;
        
        console.log('[DraftConfig] Fetching config data for org:', orgId);
        
        // Pass orgId as query parameter (camelCase per Lambda expectation)
        const [docTypesRes, criteriaSetsRes] = await Promise.all([
          fetch(`${apiUrl}/admin/org/eval/doc-types?orgId=${orgId}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${apiUrl}/admin/org/eval/criteria-sets?orgId=${orgId}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);
        
        if (!docTypesRes.ok || !criteriaSetsRes.ok) {
          console.error('[DraftConfig] API error:', {
            docTypesStatus: docTypesRes.status,
            criteriaSetsStatus: criteriaSetsRes.status
          });
          throw new Error('Failed to fetch configuration data');
        }
        
        const docTypesData = await docTypesRes.json();
        const criteriaSetsData = await criteriaSetsRes.json();
        
        console.log('[DraftConfig] Doc types response:', docTypesData);
        console.log('[DraftConfig] Criteria sets response:', criteriaSetsData);
        
        // Lambda returns array directly in data field
        const docTypesArray = Array.isArray(docTypesData) ? docTypesData : (docTypesData.data || []);
        const criteriaSetsArray = Array.isArray(criteriaSetsData) ? criteriaSetsData : (criteriaSetsData.data || []);
        
        console.log('[DraftConfig] Parsed doc types:', docTypesArray.length);
        console.log('[DraftConfig] Parsed criteria sets:', criteriaSetsArray.length);
        
        setDocTypes(docTypesArray);
        setCriteriaSets(criteriaSetsArray);
      } catch (err) {
        console.error('[DraftConfig] Error fetching config:', err);
        setError('Failed to load configuration data');
      } finally {
        setLoadingDocTypes(false);
      }
    }
    
    fetchConfigData();
  }, [token, orgId]); // Re-run when orgId is fetched

  // Fetch workspace documents from KB
  React.useEffect(() => {
    async function fetchDocuments() {
      if (!token || !workspaceId) return;
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_CORA_API_URL;
        // Use wsId variable name to match API Gateway route parameter naming
        const wsId = workspaceId;
        
        console.log('[DraftConfig] Fetching documents for workspace:', wsId);
        
        const docsRes = await fetch(`${apiUrl}/ws/${wsId}/kb/documents`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!docsRes.ok) {
          console.error('[DraftConfig] Documents API error:', docsRes.status);
          throw new Error('Failed to fetch workspace documents');
        }
        
        const docsData = await docsRes.json();
        console.log('[DraftConfig] Documents response:', docsData);
        
        // Handle nested response structure: { success, data: { documents: [...] } }
        const docsArray = Array.isArray(docsData) 
          ? docsData 
          : (docsData.data?.documents || docsData.documents || docsData.data || []);
        
        // Ensure we have an array
        const finalDocsArray = Array.isArray(docsArray) ? docsArray : [];
        
        console.log('[DraftConfig] Parsed documents:', finalDocsArray.length);
        
        setDocuments(finalDocsArray);
      } catch (err) {
        console.error('[DraftConfig] Error fetching documents:', err);
        // Don't set error - documents are optional
      } finally {
        setLoadingDocuments(false);
      }
    }
    
    fetchDocuments();
  }, [token, workspaceId]); // Fetch when workspace changes

  // Filter criteria sets by selected doc type
  const filteredCriteriaSets = React.useMemo(() => {
    if (!selectedDocTypeId) return [];
    return criteriaSets.filter(cs => cs.docTypeId === selectedDocTypeId);
  }, [selectedDocTypeId, criteriaSets]);

  // Auto-select criteria set if only one option
  React.useEffect(() => {
    if (filteredCriteriaSets.length === 1 && !selectedCriteriaSetId) {
      setSelectedCriteriaSetId(filteredCriteriaSets[0].id);
    } else if (filteredCriteriaSets.length === 0) {
      setSelectedCriteriaSetId("");
    }
  }, [filteredCriteriaSets, selectedCriteriaSetId]);

  const canSubmit = selectedDocTypeId && selectedCriteriaSetId && selectedDocIds.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfigure({
        docTypeId: selectedDocTypeId,
        criteriaSetId: selectedCriteriaSetId,
        docIds: selectedDocIds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start evaluation");
      setIsSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Evaluation Inputs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select the document type, criteria set, and documents to evaluate.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Configuration inputs grouped horizontally */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Document Type Selector */}
          <FormControl sx={{ minWidth: 200, flex: "1 1 200px" }} disabled={isSubmitting}>
            <InputLabel id="doc-type-label">Document Type</InputLabel>
            <Select
              labelId="doc-type-label"
              id="doc-type-select"
              value={selectedDocTypeId}
              label="Document Type"
              onChange={(e) => {
                setSelectedDocTypeId(e.target.value);
                setSelectedCriteriaSetId(""); // Reset criteria set when doc type changes
              }}
            >
              {loadingDocTypes ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                </MenuItem>
              ) : docTypes.length === 0 ? (
                <MenuItem disabled>No document types available</MenuItem>
              ) : (
                docTypes.map((docType) => (
                  <MenuItem key={docType.id} value={docType.id}>
                    {docType.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Criteria Set Selector */}
          <FormControl
            sx={{ minWidth: 200, flex: "1 1 200px" }}
            disabled={!selectedDocTypeId || isSubmitting}
          >
            <InputLabel id="criteria-set-label">Criteria Set</InputLabel>
            <Select
              labelId="criteria-set-label"
              id="criteria-set-select"
              value={selectedCriteriaSetId}
              label="Criteria Set"
              onChange={(e) => setSelectedCriteriaSetId(e.target.value)}
            >
              {filteredCriteriaSets.length === 0 ? (
                <MenuItem disabled>
                  {selectedDocTypeId ? "No criteria sets for this type" : "Select a document type first"}
                </MenuItem>
              ) : (
                filteredCriteriaSets.map((criteriaSet) => (
                  <MenuItem key={criteriaSet.id} value={criteriaSet.id}>
                    {criteriaSet.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Document Selector - From workspace KB */}
          <FormControl sx={{ minWidth: 200, flex: "1 1 200px" }} disabled={isSubmitting}>
            <InputLabel id="documents-label">Documents</InputLabel>
            <Select
              labelId="documents-label"
              id="documents-select"
              multiple
              value={selectedDocIds}
              label="Documents"
              onChange={(e: any) => {
                const value = e.target.value;
                setSelectedDocIds(typeof value === 'string' ? [value] : value);
              }}
              renderValue={(selected: any) => `${selected.length} document(s) selected`}
            >
              {loadingDocuments ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                </MenuItem>
              ) : !Array.isArray(documents) || documents.length === 0 ? (
                <MenuItem disabled>No documents in workspace KB</MenuItem>
              ) : (
                documents.map((doc: any) => (
                  <MenuItem key={doc.id} value={doc.id}>
                    {doc.filename || doc.name || doc.fileName || doc.title || `Document ${doc.id.slice(0, 8)}`}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Evaluate Button */}
          <Button
            variant="contained"
            color="primary"
            size="large"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            sx={{ minWidth: 140, height: 56 }}
          >
            {isSubmitting ? "Starting..." : "EVALUATE"}
          </Button>
        </Box>

        {/* Helper text */}
        {!selectedDocTypeId && (
          <Typography variant="caption" color="text.secondary">
            Start by selecting a document type
          </Typography>
        )}
        {selectedDocTypeId && !selectedCriteriaSetId && filteredCriteriaSets.length === 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            No criteria sets available for this document type. Please create one in the admin settings.
          </Alert>
        )}
      </Box>
    </Paper>
  );
}

// =============================================================================
// PROCESSING STATE COMPONENT
// =============================================================================

interface ProcessingStateProps {
  evaluation: any;
}

function ProcessingState({ evaluation }: ProcessingStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
      }}
    >
      <EvalProgressCard
        evaluation={evaluation}
        showDetails
        sx={{ maxWidth: "md", width: "100%" }}
      />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 3, textAlign: "center", maxWidth: "md" }}
      >
        Your evaluation is being processed. This page will automatically update
        when processing is complete.
      </Typography>
    </Box>
  );
}

// =============================================================================
// LOADING STATE COMPONENT
// =============================================================================

function LoadingState() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
    </Box>
  );
}

// =============================================================================
// ERROR STATE COMPONENT
// =============================================================================

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  onBack?: () => void;
}

function ErrorState({ error, onRetry, onBack }: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          mb: 2,
          borderRadius: "50%",
          bgcolor: "error.lighter",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ErrorIcon sx={{ width: 32, height: 32, color: "error.main" }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        Failed to load evaluation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3, maxWidth: "md" }}>
        {error.message}
      </Typography>
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {onBack && (
          <Button variant="outlined" onClick={onBack}>
            Go Back
          </Button>
        )}
        <Button variant="contained" onClick={onRetry}>
          Try Again
        </Button>
      </Box>
    </Box>
  );
}

// =============================================================================
// DOCUMENTS TAB COMPONENT
// =============================================================================

interface DocumentMetadata {
  author?: string;
  wordCount?: number;
  createdDate?: string; // ISO format
  paragraphCount?: number;
  [key: string]: any; // Allow other fields but we'll filter out technical ones
}

interface DocumentsTabProps {
  documents: Array<{
    id: string;
    name: string;
    summary?: string;
    pageCount?: number;
    createdAt?: string;
    metadata?: DocumentMetadata;
  }>;
  activeDocumentId?: string; // For auto-expansion from Issue A7
}

// Simple markdown to HTML converter (same as used in EvalSummaryPanel)
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Normalize line endings
  html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Convert headings
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Convert unordered lists
  html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Convert line breaks (double newline = paragraph)
  const paragraphs = html.split('\n\n');
  html = paragraphs
    .filter((p) => p.trim())
    .map((p) => {
      // Don't wrap if already a block element
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

function DocumentsTab({ documents, activeDocumentId }: DocumentsTabProps) {
  const [expandedDocs, setExpandedDocs] = React.useState<Set<string>>(
    new Set(activeDocumentId ? [activeDocumentId] : [])
  );

  // Auto-expand document when activeDocumentId changes (for Issue A7)
  React.useEffect(() => {
    if (activeDocumentId) {
      setExpandedDocs((prev) => new Set([...prev, activeDocumentId]));
    }
  }, [activeDocumentId]);

  const handleToggle = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  if (documents.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="body2" color="text.secondary">
          No documents in this evaluation.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {documents.map((doc) => {
        const isExpanded = expandedDocs.has(doc.id);
        const hasMetadata = doc.metadata && Object.keys(doc.metadata).length > 0;
        
        // Filter metadata to show only user-relevant fields (omit technical details)
        const displayMetadata: Record<string, any> = {};
        if (doc.metadata) {
          // Fields to include
          if (doc.metadata.author) displayMetadata['Author'] = doc.metadata.author;
          if (doc.metadata.wordCount) displayMetadata['Word Count'] = doc.metadata.wordCount.toLocaleString();
          if (doc.metadata.createdDate) {
            // Display date only (not time)
            const date = new Date(doc.metadata.createdDate);
            displayMetadata['Created'] = date.toLocaleDateString();
          }
          if (doc.metadata.paragraphCount) displayMetadata['Paragraphs'] = doc.metadata.paragraphCount;
          // Note: Intentionally omitting technical fields like parsing library
        }

        return (
          <Paper 
            key={doc.id} 
            variant="outlined" 
            sx={{ 
              overflow: 'hidden',
              bgcolor: activeDocumentId === doc.id ? 'action.hover' : 'background.paper',
              transition: 'background-color 0.2s'
            }}
          >
            {/* Document Header - Always Visible */}
            <Box
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                '&:hover': { bgcolor: 'action.hover' }
              }}
              onClick={() => handleToggle(doc.id)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 1,
                    bgcolor: "primary.lighter",
                  }}
                >
                  <DescriptionIcon sx={{ width: 20, height: 20, color: "primary.main" }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2">{doc.name}</Typography>
                  {doc.pageCount && (
                    <Typography variant="caption" color="text.secondary">
                      {doc.pageCount} pages
                    </Typography>
                  )}
                </Box>
              </Box>
              <IconButton
                size="small"
                aria-label={isExpanded ? "Collapse document details" : "Expand document details"}
                sx={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>

            {/* Expandable Content */}
            {isExpanded && (
              <Box sx={{ px: 2, pb: 2, pt: 0 }}>
                {/* Metadata Section */}
                {hasMetadata && Object.keys(displayMetadata).length > 0 && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 1.5
                    }}
                  >
                    {Object.entries(displayMetadata).map(([label, value]) => (
                      <Box key={label}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Document Summary */}
                {doc.summary && (
                  <Box sx={{ pt: hasMetadata ? 0 : 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                      Document Summary
                    </Typography>
                    <Box
                      sx={{
                        '& p': { mb: 1, lineHeight: 1.6 },
                        '& h1, & h2, & h3, & h4': { mt: 2, mb: 1, fontWeight: 600 },
                        '& ul, & ol': { pl: 3, mb: 1 },
                        '& li': { mb: 0.5 },
                        '& code': { 
                          px: 0.5, 
                          py: 0.25, 
                          bgcolor: 'action.hover', 
                          borderRadius: 0.5,
                          fontFamily: 'monospace',
                          fontSize: '0.9em'
                        },
                        '& a': { color: 'primary.main', textDecoration: 'underline' }
                      }}
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(doc.summary) }}
                    />
                  </Box>
                )}

                {!doc.summary && !hasMetadata && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No additional details available for this document.
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EvalDetailPage({
  evaluationId,
  workspaceId,
  orgId,
  token,
  className = "",
  onBack,
  loadingComponent,
  showBackButton = true,
}: EvalDetailPageProps) {
  // State
  const [activeTab, setActiveTab] = useState<ViewTab>("results");
  const [editingResult, setEditingResult] = useState<CriteriaResultWithItem | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(undefined);
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);

  // Hooks
  const {
    evaluation,
    isLoading,
    error,
    refresh,
    edit,
    update,
  } = useEvaluation(token, workspaceId, evaluationId);

  // Load active status options for badge color coding
  const { options: activeStatusOptions } = useActiveStatusOptions(token, orgId);

  // Extract results, documents, citations from evaluation object
  const results = evaluation?.criteriaResults || [];
  const documents = evaluation?.documents || [];
  const citations = evaluation?.citations || [];

  const { progress, isProcessing } = useEvalProgress(token, workspaceId, evaluationId);
  const { downloadPdf, downloadXlsx, isExporting } = useEvalExport(token, workspaceId, evaluationId);

  // Handlers
  const handleTabChange = useCallback((tab: ViewTab) => {
    setActiveTab(tab);
  }, []);

  const handleDocumentClick = useCallback((documentId: string) => {
    setActiveDocumentId(documentId);
    setActiveTab("documents");
  }, []);

  const handleEditResult = useCallback((result: CriteriaResultWithItem) => {
    setEditingResult(result);
  }, []);

  const handleSaveEdit = useCallback(async (resultId: string, data: EditResultInput) => {
    await edit(resultId, data);
    setEditingResult(null);
  }, [edit]);

  const handleCloseEdit = useCallback(() => {
    setEditingResult(null);
  }, []);

  const handleExport = useCallback(async (evaluationId: string, format: "pdf" | "xlsx") => {
    const exportFn = format === "pdf" ? downloadPdf : downloadXlsx;
    await exportFn();
  }, [downloadPdf, downloadXlsx]);

  const handleConfigure = useCallback(async (config: { docTypeId: string; criteriaSetId: string; docIds: string[] }) => {
    await update(config);
    // After successful update, the evaluation will transition to pending/processing
    // The useEvalProgress hook will start polling automatically
    refresh();
  }, [update, refresh]);

  // Render loading state (also covers initial mount before evaluation loads)
  if (isLoading || (!evaluation && !error)) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        {loadingComponent || <LoadingState />}
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <ErrorState error={typeof error === 'string' ? new Error(error) : error} onRetry={refresh} />
      </Box>
    );
  }

  // Render not found state (only after loading complete)
  if (!evaluation) {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <ErrorState
          error={new Error("Evaluation not found")}
          onRetry={refresh}
          onBack={onBack}
        />
      </Box>
    );
  }

  // Render draft configuration state
  if (evaluation.status === "draft") {
    return (
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }} className={className}>
        <Header
          title={evaluation.name || "Configure Evaluation"}
          status={evaluation.status}
          evaluation={evaluation}
          workspaceId={workspaceId}
          token={token}
          onBack={onBack}
          showBackButton={showBackButton}
          onExport={handleExport}
        />
        <DraftConfiguration
          evaluationId={evaluationId}
          evaluationName={evaluation.name}
          workspaceId={workspaceId}
          token={token}
          onConfigure={handleConfigure}
        />
      </Box>
    );
  }

  // Render processing state
  if (isProcessing || evaluation.status === "processing" || evaluation.status === "pending") {
    return (
      <Box sx={{ p: 3 }} className={className}>
        <Header
          title={evaluation.name || "Evaluation"}
          status={evaluation.status}
          evaluation={evaluation}
          workspaceId={workspaceId}
          token={token}
          onBack={onBack}
          showBackButton={showBackButton}
          onExport={handleExport}
        />
        <ProcessingState
          evaluation={evaluation}
        />
      </Box>
    );
  }

  // Collect all citations from results
  const allCitations: Citation[] = citations || results?.flatMap((r) => r.aiResult?.citations || []) || [];

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }} className={className}>
      {/* Header */}
      <Header
        title={evaluation.name || "Evaluation"}
        status={evaluation.status}
        evaluation={evaluation}
        workspaceId={workspaceId}
        token={token}
        onBack={onBack}
        showBackButton={showBackButton}
        onExport={handleExport}
        expandAll={expandAll}
        onExpandAllChange={setExpandAll}
      />

      {/* Summary Panel */}
      <EvalSummaryPanel
        evaluation={evaluation}
        onDocumentClick={handleDocumentClick}
        expandAll={expandAll}
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        resultCount={results?.length || 0}
        citationCount={allCitations.length}
        documentCount={documents?.length || 0}
      />

      {/* Tab Content */}
      <Box sx={{ minHeight: 400 }}>
        {activeTab === "results" && (
          <EvalQAList
            results={results || []}
            statusOptions={activeStatusOptions}
            scoreConfig={evaluation?.scoreConfig}
            groupByCategory={false}
            editable={true}
            onEdit={handleEditResult}
            expandAll={expandAll}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsTab
            documents={documents?.map((d) => ({
              id: d.id,
              name: d.name || d.fileName || d.documentId || `Document ${documents.indexOf(d) + 1}`,
              summary: d.summary,
              metadata: d.metadata,
            })) || []}
            activeDocumentId={activeDocumentId}
          />
        )}
      </Box>

      {/* Edit Dialog */}
      {editingResult && (
        <ResultEditDialog
          result={editingResult}
          onSave={handleSaveEdit}
          onClose={handleCloseEdit}
          isOpen={true}
          statusOptions={activeStatusOptions}
        />
      )}
    </Box>
  );
}

export default EvalDetailPage;
