'use client';

import { OrgAiAdmin } from '@{{PROJECT_NAME}}/module-ai/admin';

/**
 * Organization AI Admin Page
 * Renders the OrgAiAdmin component from module-ai.
 * 
 * This page follows the standard admin component pattern (01_std_front_ADMIN-COMPONENTS.md):
 * - All admin pages use module-provided components
 * - Component handles auth, loading, and API calls internally
 * - Route metadata documented in component docstring
 */

export default function OrgAIAdminPage() {
  return <OrgAiAdmin />;
}