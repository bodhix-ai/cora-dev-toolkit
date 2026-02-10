/**
 * @component SysAccessAdmin
 * @description System Access Admin Component - Main admin page for Access module at system level
 *
 * Provides interface for:
 * - Managing organizations
 * - Managing users
 * - Identity Provider configuration
 * - System-wide access control
 *
 * @routes
 * - GET /admin/sys/access/orgs - List organizations
 * - POST /admin/sys/access/orgs - Create organization
 * - PUT /admin/sys/access/orgs/{id} - Update organization
 * - DELETE /admin/sys/access/orgs/{id} - Delete organization
 * - GET /admin/sys/access/users - List users
 * - POST /admin/sys/access/users - Create user
 * - PUT /admin/sys/access/users/{id} - Update user
 * - DELETE /admin/sys/access/users/{id} - Delete user
 * - GET /admin/sys/access/idp - Get IdP configuration
 * - PUT /admin/sys/access/idp - Update IdP configuration
 */

import React from 'react';
import { useUser, useRole, createOktaAuthAdapter } from '../..';
import { Box, CircularProgress, Alert } from '@mui/material';
import { AccessControlAdmin } from './AccessControlAdmin';

/**
 * System Access Admin Component
 *
 * ✅ STANDARD PATTERN (01_std_front_ADMIN-ARCH.md):
 * - Component handles auth, loading internally
 * - No props required - thin wrapper page just renders this component
 * - Creates Okta auth adapter for Access module
 *
 * @example
 * ```tsx
 * <SysAccessAdmin />
 * ```
 */
export function SysAccessAdmin(): React.ReactElement {
  // ✅ Auth hooks - component is self-sufficient
  const { loading, isAuthenticated, profile } = useUser();
  const { isSysAdmin } = useRole();

  // ✅ Loading state handling
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // ✅ Authorization check
  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to system administrators.
        </Alert>
      </Box>
    );
  }

  // ✅ Create Okta auth adapter
  const authAdapter = createOktaAuthAdapter();

  // ✅ Render the presentational component
  return <AccessControlAdmin authAdapter={authAdapter} />;
}

export default SysAccessAdmin;