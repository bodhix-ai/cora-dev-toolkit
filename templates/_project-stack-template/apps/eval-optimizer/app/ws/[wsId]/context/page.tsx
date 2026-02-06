'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Context Documents Page
 * 
 * This page uses the existing module-kb WorkspaceDataKBTab component
 * to manage context documents for RAG-based prompt generation.
 * 
 * Context documents are KB documents in the workspace - they use
 * the same upload, storage, and RAG functionality as regular KB docs.
 * The only difference is the UI guidance explaining their purpose.
 */

// Import module-kb components
import { WorkspaceDataKBTab } from '@cora/module-kb/components/WorkspaceDataKBTab';
import { useWorkspaceKB } from '@cora/module-kb/hooks/useWorkspaceKB';
import { useKbDocuments } from '@cora/module-kb/hooks/useKbDocuments';

export default function ContextDocumentsPage() {
  const params = useParams();
  const wsId = params.wsId as string;
  const { data: session } = useSession();

  // Use existing module-kb hooks for KB and document management
  const {
    kb,
    availableKbs,
    loading: kbLoading,
    error: kbError,
    toggleKb,
  } = useWorkspaceKB(wsId);

  const {
    documents,
    loading: docsLoading,
    error: docsError,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    retryDocument,
  } = useKbDocuments(wsId);

  const error = kbError || docsError;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Context-specific guidance */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Context Documents</h1>
        <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
          Upload domain standards, guides, and requirements for RAG-based prompt generation.
        </p>
      </div>

      {/* Context-specific info box */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #b8daff',
        }}
      >
        <h4 style={{ marginTop: 0, color: '#0056b3' }}>
          Why Context Documents Matter
        </h4>
        <p style={{ color: '#333', marginBottom: '1rem' }}>
          Context documents provide <strong>domain knowledge</strong> that the system uses to generate 
          <strong> domain-aware prompts</strong>. The system extracts key concepts, standards, and 
          terminology from these documents to create contextually appropriate evaluation prompts.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <strong>Example Use Cases:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
              <li>IT Security Audits → CJIS requirements, security controls</li>
              <li>Federal Appraisals → USPAP guidelines</li>
              <li>FOIA Requests → Exemption rules, redaction policies</li>
            </ul>
          </div>
          <div>
            <strong>Best Practices:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
              <li>Upload authoritative standards documents</li>
              <li>Include requirement definitions</li>
              <li>Add example evaluation criteria</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Existing module-kb component for document management */}
      <WorkspaceDataKBTab
        kb={kb}
        availableKbs={availableKbs}
        documents={documents}
        kbLoading={kbLoading}
        documentsLoading={docsLoading}
        error={error}
        canUpload={true}
        onToggleKb={toggleKb}
        onUploadDocument={uploadDocument}
        onDeleteDocument={deleteDocument}
        onDownloadDocument={downloadDocument}
        onRetryDocument={retryDocument}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}