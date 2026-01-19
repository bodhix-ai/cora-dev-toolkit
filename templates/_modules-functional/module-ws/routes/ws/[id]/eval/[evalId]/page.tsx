/**
 * Workspace Evaluation Detail Route
 *
 * Displays detailed evaluation results within workspace context.
 * Uses EvalDetailPage component from module-eval with workspace params.
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { EvalDetailPage } from "@{{PROJECT_NAME}}/module-eval";

export default function WorkspaceEvalDetailRoute() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganizationContext();

  const workspaceId = params.id as string;
  const evaluationId = params.evalId as string;

  return (
    <EvalDetailPage
      evaluationId={evaluationId}
      workspaceId={workspaceId}
      onBack={() => router.push(`/ws/${workspaceId}`)}
      showBackButton={true}
    />
  );
}
