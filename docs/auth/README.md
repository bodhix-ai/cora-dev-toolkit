# Authentication & User Onboarding Documentation

**Last Updated**: December 8, 2025

## Overview

This directory contains comprehensive documentation for authentication, authorization, and user onboarding in the STS Career Stack application.

## Current Documentation

### 📖 [AUTHORIZER-MIGRATION-AND-USER-ONBOARDING.md](./AUTHORIZER-MIGRATION-AND-USER-ONBOARDING.md)
**Comprehensive master document covering:**
- API Gateway Authorizer migration from org-module to infra repo
- Current authentication architecture (Okta + JWT)
- User auto-provisioning flow
- Invitation system implementation
- Organization creation gating (Option B: platform_owner pattern)
- Implementation guides for backend, frontend, and database
- Test scenarios and decision trees

### 📄 [../USER-INVITATION-FLOW.md](../USER-INVITATION-FLOW.md)
**Detailed invitation system documentation:**
- Database schema (`org_invites` table)
- API endpoints for invitation management
- Invitation acceptance workflow
- Row-level security policies
- Error handling

## Archived Documentation

Historical documentation has been moved to `archive/`:
- `okta-login-organization-context.md` - Initial implementation (Oct 30, 2025)
- `onboarding-and-org-management-requirements.md` - Planning doc (Oct 31, 2025)

These files are preserved for historical reference but have been superseded by the current documentation.

## Quick Reference

### For Developers

**Current Authorizer Location**: `sts-career-infra/lambdas/api-gateway-authorizer/`
- Validates JWT tokens from Okta
- Extracts user claims (email, name, etc.)
- Returns authorization policy for API Gateway
- **Critical**: Falls back to `sub` claim when `email` claim missing

**User Provisioning**: `packages/org-module/backend/lambdas/profiles/lambda_function.py`
- Auto-provisions users on first login
- Checks for pending invitations
- Creates org membership if invitation exists
- Sets `current_org_id` for invited users

**Invitation Management**: `packages/org-module/backend/lambdas/invitations/lambda_function.py`
- Create/list/cancel org invitations
- Enforce single pending invitation per email
- Handle invitation expiration

### For AI Assistants

When implementing user invitation gating (preventing multiple platform owners):

1. **Backend**: Add `requires_invitation` flag check in Profiles Lambda
   - Check if `platform_owner` exists
   - If exists + no invitation → set flag = TRUE
   - See decision tree in master doc

2. **Frontend**: Update onboarding page to show message when flag is TRUE
   - "Contact your administrator for an invitation"
   - No organization creation form

3. **Database**: Add `requires_invitation BOOLEAN` column to `profiles` table
   - Migration file needed
   - Index for performance

**Complete implementation details**: See [AUTHORIZER-MIGRATION-AND-USER-ONBOARDING.md](./AUTHORIZER-MIGRATION-AND-USER-ONBOARDING.md) Section 5

## Related Documentation

### Infrastructure
- `sts-career-infra/docs/ADR-001-AUTHORIZER-MIGRATION.md` - Migration decision record
- `sts-career-infra/docs/OKTA-DEPLOYMENT-GUIDE.md` - Okta configuration

### Database
- `sql/migrations/009_create_org_invites.sql` - Invitation table migration

## Status

- ✅ Authorizer migrated to infra repo (Nov 2, 2025)
- ✅ Email extraction fix deployed (Dec 8, 2025)
- ✅ Legacy authorizer directory removed (Dec 8, 2025)
- ✅ Invitation system complete and tested (Dec 8, 2025)
- ⏳ Organization creation gating (pending implementation)

## Contact

For questions or clarifications, refer to:
- Infrastructure Team (authorizer, deployment)
- Development Team (Lambda functions, frontend)
- Documentation updates via pull request
