/**
 * Admin Components - module-access
 *
 * Components for org admin and system admin access management.
 */

// Admin Page Components (thin wrapper pattern)
export { OrgAccessAdmin } from './OrgAccessAdmin';
export { SysAccessAdmin } from './SysAccessAdmin';
export { SysOrgDetailsAdmin } from './SysOrgDetailsAdmin';

// Admin Tab Components
export { AccessControlAdmin } from './AccessControlAdmin';
export { IdpTab } from './IdpTab';
export { IdpConfigCard } from './IdpConfigCard';
export { OrgsTab } from './OrgsTab';
export { UsersTab } from './UsersTab';

// Org-specific components
export { OrgAccessPage } from './OrgAccessPage';
export { OrgDetails } from './OrgDetails';
export { OrgDetailsTab } from './OrgDetailsTab';
export { OrgDomainsTab } from './OrgDomainsTab';
export { OrgInvitesTab } from './OrgInvitesTab';
export { OrgMembersTab } from './OrgMembersTab';
export { default as OrgMgmt } from './OrgMgmt';
export { OrgAIConfigTab } from './OrgAIConfigTab';