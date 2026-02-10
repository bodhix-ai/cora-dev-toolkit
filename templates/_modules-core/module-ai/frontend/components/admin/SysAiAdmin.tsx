/**
 * @component SysAiAdmin
 * @description System AI Admin Component - Main admin page for AI module at system level
 *
 * Provides interface for:
 * - Managing AI providers (OpenAI, Anthropic, Azure OpenAI, etc.)
 * - Testing provider connections and credentials
 * - Discovering and validating AI models
 * - Viewing model availability and capabilities
 * - Configuring system-wide AI defaults
 *
 * @routes
 * - GET /admin/sys/ai/providers - List AI providers
 * - POST /admin/sys/ai/providers - Add AI provider
 * - PUT /admin/sys/ai/providers/{id} - Update AI provider
 * - DELETE /admin/sys/ai/providers/{id} - Delete AI provider
 * - POST /admin/sys/ai/providers/{id}/test - Test provider connection
 * - GET /admin/sys/ai/models - List AI models
 * - POST /admin/sys/ai/models/discover - Discover available models
 * - GET /admin/sys/ai/config - Get system AI configuration
 * - PUT /admin/sys/ai/config - Update system AI configuration
 */

import React from 'react';
import { useUser, useRole } from '@{{PROJECT_NAME}}/module-access';
import { Box, CircularProgress, Alert } from '@mui/material';
import { AIEnablementAdmin } from './AIEnablementAdmin';

/**
 * System AI Admin Component
 *
 * ✅ STANDARD PATTERN (01_std_front_ADMIN-ARCH.md):
 * - Component handles auth, loading internally
 * - No props required - thin wrapper page just renders this component
 * - Extracts authAdapter from useUser() for AI module
 *
 * @example
 * ```tsx
 * <SysAiAdmin />
 * ```
 */
export function SysAiAdmin(): React.ReactElement {
  // ✅ Auth hooks - component is self-sufficient
  const { loading, isAuthenticated, profile, authAdapter } = useUser();
  const { isSysAdmin } = useRole();

  // ✅ Loading state handling
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // ✅ Authorization check
  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
        </Alert>
      </Box>
    );
  }

  // ✅ Render the presentational component
  return <AIEnablementAdmin authAdapter={authAdapter} />;
}

export default SysAiAdmin;