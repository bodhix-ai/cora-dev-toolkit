'use client';

/**
 * Evaluations List Route
 * Path: /eval
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useOrgContext } from '@/contexts/OrgContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';
import { EvalListPage } from '@{{PROJECT_NAME}}/module-eval';

export default function Page() {
  const router = useRouter();
  const { currentOrg } = useOrgContext();
  const { currentWorkspace } = useWorkspaceContext();

  if (!currentOrg || !currentWorkspace) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Please select an organization and workspace to view evaluations.
        </Typography>
      </Box>
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
