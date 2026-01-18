'use client';

/**
 * Evaluation Detail Route
 * Path: /eval/[id]
 */

import React from 'react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';
import { EvalDetailPage } from '@{project}/module-eval';

export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceContext();

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please select a workspace to view evaluation details.
        </div>
      </div>
    );
  }

  return (
    <EvalDetailPage
      evaluationId={params.id}
      workspaceId={currentWorkspace.id}
      onBack={() => router.push('/eval')}
    />
  );
}
