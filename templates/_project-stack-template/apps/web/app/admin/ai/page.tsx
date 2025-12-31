"use client";

import React from "react";
import { AIEnablementAdmin } from "@{{PROJECT_NAME}}/module-ai";
import { useUser } from "@{{PROJECT_NAME}}/module-access";

/**
 * AI Enablement Admin Page
 * 
 * Platform admin interface for managing AI providers, models, and configuration.
 * Accessible only to platform_owner and platform_admin roles.
 * 
 * Features:
 * - Manage AI providers (OpenAI, Anthropic, Azure OpenAI, etc.)
 * - Test provider connections and credentials
 * - Discover and validate AI models
 * - View model availability and capabilities
 * - Configure platform-wide AI defaults (chat model, embedding model, system prompt)
 */
export default function AIAdminPage() {
  const { authAdapter, loading } = useUser();
  
  if (loading || !authAdapter) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Loading...</p>
      </div>
    );
  }
  
  return <AIEnablementAdmin authAdapter={authAdapter} />;
}
