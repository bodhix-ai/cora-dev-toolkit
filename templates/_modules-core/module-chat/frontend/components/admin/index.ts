/**
 * Admin Components - module-chat
 *
 * Components for org admin and system admin chat management.
 */

// Admin Page Components (thin wrapper pattern)
export { OrgChatAdmin } from './OrgChatAdmin';
export { SysChatAdmin } from './SysChatAdmin';

// Admin Tab Components (Org scope)
export { OrgAnalyticsTab } from './OrgAnalyticsTab';
export { OrgSessionsTab } from './OrgSessionsTab';
export { OrgSettingsTab } from './OrgSettingsTab';

// Admin Tab Components (Sys scope)
export { SysAnalyticsTab } from './SysAnalyticsTab';
export { SysSessionsTab } from './SysSessionsTab';
export { SysSettingsTab } from './SysSettingsTab';