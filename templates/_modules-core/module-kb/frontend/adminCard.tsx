/**
 * Module KB - Admin Cards
 * 
 * Admin dashboard cards for knowledge base management.
 * Following CORA Admin Card Pattern (standard_ADMIN-CARD-PATTERN.md)
 */

import React from 'react';
import { LibraryBooks as KBIcon, Public as GlobalIcon } from '@mui/icons-material';
import type { AdminCardConfig } from '@{{PROJECT_NAME}}/shared-types';

/**
 * Organization Knowledge Base Admin Card
 * 
 * Provides org admins access to organization-level KB management
 * including creating, editing, and managing org knowledge bases.
 */
export const orgKnowledgeBaseCard: AdminCardConfig = {
  id: 'org-knowledge-bases',
  title: 'Knowledge Bases',
  description: 'Manage organization knowledge bases and documents for RAG',
  icon: <KBIcon sx={{ fontSize: 48 }} />,
  href: '/admin/org/kb',
  context: 'organization',
  color: 'info.main',
  order: 30, // After org settings (10) and members (20)
  requiredRoles: ['sys_owner', 'sys_admin', 'org_owner', 'org_admin'],
};

/**
 * Platform Knowledge Base Admin Card
 * 
 * Provides platform admins access to system-wide KB management
 * including creating global KBs shared across organizations.
 */
export const platformKnowledgeBaseCard: AdminCardConfig = {
  id: 'sys-knowledge-bases',
  title: 'System Knowledge Bases',
  description: 'Manage platform-wide knowledge bases shared across organizations',
  icon: <GlobalIcon sx={{ fontSize: 48 }} />,
  href: '/admin/sys/kb',
  context: 'platform',
  color: 'info.main',
  order: 40, // After core platform features
  requiredRoles: ['sys_owner', 'sys_admin'],
};
