"use client";

/**
 * Chat List Page
 *
 * Route: /chat
 * Renders the chat list page from module-chat.
 */

import { useRouter } from "next/navigation";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { ChatListPage } from "@{{PROJECT_NAME}}/module-chat";
import type { ChatSession } from "@{{PROJECT_NAME}}/module-chat";

export default function ChatsPage() {
  const router = useRouter();
  const { currentWorkspace } = useOrganizationContext();

  const handleChatSelect = (chat: ChatSession) => {
    router.push(`/chat/${chat.id}`);
  };

  return (
    <ChatListPage
      workspaceId={currentWorkspace?.id}
      onChatSelect={handleChatSelect}
    />
  );
}
