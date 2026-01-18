'use client';

/**
 * Evaluations List Route
 * Path: /eval
 */

import React from 'react';
import { useOrgContext } from '@/contexts/OrgContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';
import { EvalListPage } from '@{project}/module-eval';

export default function Page() {
  const router = useRouter();
  const { currentOrg } = useOrgContext();
  const { currentWorkspace } = useWorkspaceContext();

  if (!currentOrg || !currentWorkspace) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please select an organization and workspace to view evaluations.
        </div>
      </div>
    );
  }

  return (
    <EvalListPage
      workspaceId={currentWorkspace.id}
      orgId={currentOrg.id}
      onSelectEvaluation={(evaluation) => router.push(`/eval/${evaluation.id}`)}
      onCreateEvaluation={() => router.push('/eval/new')}
    />
  );
}
