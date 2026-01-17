"use client";

/**
 * Chat Detail Page
 *
 * Route: /chat/[id]
 * Renders the chat detail page from module-chat.
 */

import { useParams, useRouter } from "next/navigation";
import { useOrganizationContext, useUser } from "@{{PROJECT_NAME}}/module-access";
import { ChatDetailPage } from "@{{PROJECT_NAME}}/module-chat";

export default function ChatDetailRoute() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization, currentWorkspace } = useOrganizationContext();
  const { profile } = useUser();
  const chatId = params.id as string;
  const orgId = currentOrganization?.orgId || "";
  const userId = profile?.id || "";

  const handleBack = () => {
    router.push("/chat");
  };

  const handleDeleted = () => {
    router.push("/chat");
  };

  return (
    <ChatDetailPage
      sessionId={chatId}
      workspaceId={currentWorkspace?.id}
      orgId={orgId}
      userId={userId}
      onBack={handleBack}
      onDeleted={handleDeleted}
      showBackButton={true}
    />
  );
}
