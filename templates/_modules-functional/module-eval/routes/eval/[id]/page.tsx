'use client';

/**
 * Evaluation Detail Route
 * Path: /eval/[id]
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';
import { EvalDetailPage } from '@{{PROJECT_NAME}}/module-eval';

export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceContext();

  if (!currentWorkspace) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Please select a workspace to view evaluation details.
        </Typography>
      </Box>
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
