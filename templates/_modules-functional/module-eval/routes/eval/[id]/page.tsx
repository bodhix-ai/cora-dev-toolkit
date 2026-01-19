'use client';

/**
 * Evaluation Detail Route
 * Path: /eval/[id]
 * 
 * Supports flat routing pattern with optional workspace context via query params.
 * Example: /eval/123?workspace=456
 */

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { EvalDetailPage } from '@{{PROJECT_NAME}}/module-eval';

export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  const { data: session } = useSession();

  return (
    <EvalDetailPage
      evaluationId={params.id}
      workspaceId={workspaceId || undefined}
      token={session?.accessToken as string | null}
      onBack={() => {
        // If workspace context exists, go back to workspace
        if (workspaceId) {
          router.push(`/ws/${workspaceId}?tab=eval`);
        } else {
          // Otherwise go to eval list
          router.push('/eval');
        }
      }}
    />
  );
}
