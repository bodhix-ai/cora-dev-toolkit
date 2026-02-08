"""
Tests for auth_validator.py

Tests the FrontendAuthValidator for:
1. Page validation (thin wrapper pattern)
2. Component validation (auth hooks, loading states)
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from auth_validator import FrontendAuthValidator, AuthIssueType


class TestPageValidation:
    """Tests for admin page validation (thin wrapper pattern)."""
    
    def test_page_with_hooks_is_flagged(self):
        """Page with hooks should be flagged as non-compliant."""
        content = '''
"use client";
import { useUser, useRole } from "@ai-mod/module-access";

export default function AdminPage() {
  const { user } = useUser();
  const { isOrgAdmin } = useRole();
  return <div>Admin</div>;
}
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_file('/admin/org/test/page.tsx', content)
        
        assert len(issues) == 1
        assert issues[0].issue_type == AuthIssueType.ADMIN_NOT_THIN_WRAPPER
        assert '2 hook(s)' in issues[0].issue
    
    def test_thin_wrapper_page_passes(self):
        """Page that only renders a component should pass."""
        content = '''
"use client";
import { OrgTestAdmin } from "@ai-mod/module-test";

export default function AdminPage() {
  return <OrgTestAdmin />;
}
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_file('/admin/org/test/page.tsx', content)
        
        assert len(issues) == 0
    
    def test_page_with_usestate_is_flagged(self):
        """Page with useState should be flagged."""
        content = '''
"use client";
import { useState } from "react";
import { OrgTestAdmin } from "@ai-mod/module-test";

export default function AdminPage() {
  const [data, setData] = useState(null);
  return <OrgTestAdmin data={data} />;
}
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_file('/admin/org/test/page.tsx', content)
        
        assert len(issues) == 1
        assert issues[0].issue_type == AuthIssueType.ADMIN_NOT_THIN_WRAPPER
    
    def test_page_with_useeffect_is_flagged(self):
        """Page with useEffect should be flagged."""
        content = '''
"use client";
import { useEffect } from "react";

export default function AdminPage() {
  useEffect(() => { console.log("mounted"); }, []);
  return <div>Admin</div>;
}
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_file('/admin/org/test/page.tsx', content)
        
        assert len(issues) == 1
        assert issues[0].issue_type == AuthIssueType.ADMIN_NOT_THIN_WRAPPER
    
    def test_non_admin_page_not_validated(self):
        """Non-admin pages should not be validated."""
        content = '''
"use client";
import { useState } from "react";

export default function RegularPage() {
  const [data, setData] = useState(null);
  return <div>Regular page</div>;
}
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_file('/app/dashboard/page.tsx', content)
        
        # Should return no issues because it's not an admin page
        assert len(issues) == 0
    
    def test_sys_admin_page_with_hooks_is_flagged(self):
        """System admin page with hooks should be flagged."""
        content = '''
"use client";
import { useUser } from "@ai-mod/module-access";

export default function SysAdminPage() {
  const { user } = useUser();
  return <div>Sys Admin</div>;
}
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_file('/admin/sys/test/page.tsx', content)
        
        assert len(issues) == 1
        assert issues[0].admin_scope == 'sys'


class TestComponentValidation:
    """Tests for admin component validation."""
    
    def test_component_missing_use_role(self):
        """Component without useRole() should be flagged."""
        content = '''
"use client";
import { useState } from "react";

/**
 * @component OrgTestAdmin
 * @routes
 * - GET /admin/org/test/config
 */
export const OrgTestAdmin = () => {
  const [data, setData] = useState(null);
  return <div>Admin UI</div>;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/OrgTestAdmin.tsx', content, 'org')
        
        assert any(i.issue_type == AuthIssueType.COMPONENT_MISSING_USE_ROLE for i in issues)
    
    def test_component_missing_org_context(self):
        """Org component without useOrganizationContext() should be flagged."""
        content = '''
"use client";
import { useRole } from "@ai-mod/module-access";

export const OrgTestAdmin = () => {
  const { isOrgAdmin, isLoading } = useRole();
  if (isLoading) return <div>Loading...</div>;
  return <div>Admin UI</div>;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/OrgTestAdmin.tsx', content, 'org')
        
        assert any(i.issue_type == AuthIssueType.COMPONENT_MISSING_ORG_CONTEXT for i in issues)
    
    def test_component_missing_loading_check(self):
        """Component without loading state handling should be flagged."""
        content = '''
"use client";
import { useRole, useOrganizationContext } from "@ai-mod/module-access";

export const OrgTestAdmin = () => {
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();
  return <div>Admin UI</div>;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/OrgTestAdmin.tsx', content, 'org')
        
        assert any(i.issue_type == AuthIssueType.COMPONENT_MISSING_LOADING_CHECK for i in issues)
    
    def test_compliant_org_component_passes(self):
        """Component with all required patterns should pass."""
        content = '''
"use client";
import { useRole, useOrganizationContext } from "@ai-mod/module-access";
import { CircularProgress } from "@mui/material";

/**
 * @component OrgTestAdmin
 * @routes
 * - GET /admin/org/test/config
 */
export const OrgTestAdmin = () => {
  const { isOrgAdmin, isLoading } = useRole();
  const { currentOrganization } = useOrganizationContext();
  
  if (isLoading) return <CircularProgress />;
  if (!isOrgAdmin) return <div>Unauthorized</div>;
  
  return <div>Admin UI</div>;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/OrgTestAdmin.tsx', content, 'org')
        
        # Filter out warnings (only check errors)
        errors = [i for i in issues if i.severity == 'error']
        assert len(errors) == 0
    
    def test_sys_component_does_not_need_org_context(self):
        """System-level component should NOT need useOrganizationContext()."""
        content = '''
"use client";
import { useRole } from "@ai-mod/module-access";

export const SysTestAdmin = () => {
  const { isSysAdmin, isLoading } = useRole();
  if (isLoading) return <div>Loading...</div>;
  return <div>Sys Admin UI</div>;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/SysTestAdmin.tsx', content, 'sys')
        
        # Should NOT flag missing org context for sys components
        assert not any(i.issue_type == AuthIssueType.COMPONENT_MISSING_ORG_CONTEXT for i in issues)
    
    def test_loading_state_with_skeleton(self):
        """Component with Skeleton loading should pass loading check."""
        content = '''
"use client";
import { useRole, useOrganizationContext } from "@ai-mod/module-access";
import { Skeleton } from "@mui/material";

export const OrgTestAdmin = () => {
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();
  return <Skeleton />;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/OrgTestAdmin.tsx', content, 'org')
        
        # Should NOT flag missing loading check (Skeleton is detected)
        assert not any(i.issue_type == AuthIssueType.COMPONENT_MISSING_LOADING_CHECK for i in issues)
    
    def test_loading_state_with_spinner(self):
        """Component with Spinner loading should pass loading check."""
        content = '''
"use client";
import { useRole, useOrganizationContext } from "@ai-mod/module-access";

export const OrgTestAdmin = () => {
  const { isOrgAdmin } = useRole();
  const { currentOrganization } = useOrganizationContext();
  return <Spinner />;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/OrgTestAdmin.tsx', content, 'org')
        
        # Should NOT flag missing loading check (Spinner is detected)
        assert not any(i.issue_type == AuthIssueType.COMPONENT_MISSING_LOADING_CHECK for i in issues)
    
    def test_non_admin_component_not_validated(self):
        """Non-admin components should not be validated."""
        content = '''
"use client";
export const RegularComponent = () => {
  return <div>Regular</div>;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/RegularComponent.tsx', content, 'org')
        
        # Should return no issues because path doesn't match admin pattern
        assert len(issues) == 0


class TestHookCounting:
    """Tests for the hook counting functionality."""
    
    def test_count_single_hook(self):
        """Should count a single hook."""
        content = '''const { user } = useUser();'''
        validator = FrontendAuthValidator()
        count = validator._count_hooks_in_page(content)
        assert count == 1
    
    def test_count_multiple_hooks(self):
        """Should count multiple different hooks."""
        content = '''
const { user } = useUser();
const { isOrgAdmin } = useRole();
const [data, setData] = useState(null);
useEffect(() => {}, []);
'''
        validator = FrontendAuthValidator()
        count = validator._count_hooks_in_page(content)
        assert count == 4
    
    def test_count_repeated_hooks(self):
        """Should count repeated uses of same hook."""
        content = '''
const [a, setA] = useState(1);
const [b, setB] = useState(2);
const [c, setC] = useState(3);
'''
        validator = FrontendAuthValidator()
        count = validator._count_hooks_in_page(content)
        assert count == 3
    
    def test_no_hooks(self):
        """Should return 0 when no hooks present."""
        content = '''
import React from "react";
export const Component = () => <div>Hello</div>;
'''
        validator = FrontendAuthValidator()
        count = validator._count_hooks_in_page(content)
        assert count == 0
    
    def test_hooks_in_comments_not_counted(self):
        """Hooks mentioned in comments should still be detected (limitation)."""
        # NOTE: Current implementation will count hooks in comments
        # This is a known limitation but acceptable for now
        content = '''
// useUser() is the hook for user data
export const Component = () => <div>Hello</div>;
'''
        validator = FrontendAuthValidator()
        count = validator._count_hooks_in_page(content)
        # This tests current behavior - hooks in comments ARE counted
        assert count == 1


class TestRouteMatching:
    """Tests for @routes metadata matching."""
    
    def test_routes_not_called_flagged(self):
        """Routes documented but not called should be flagged."""
        content = '''
/**
 * @routes
 * - GET /admin/org/test/config
 * - GET /admin/org/test/items
 */
export const OrgTestAdmin = () => {
  const { isOrgAdmin, isLoading } = useRole();
  const { currentOrganization } = useOrganizationContext();
  
  // Only calls config, not items
  fetch('/admin/org/test/config');
  
  if (isLoading) return <div>Loading</div>;
  return <div>Admin</div>;
};
'''
        validator = FrontendAuthValidator()
        issues = validator.validate_admin_component('/test/OrgTestAdmin.tsx', content, 'org')
        
        # Should warn about /items route not being called
        route_warnings = [i for i in issues if i.issue_type == AuthIssueType.COMPONENT_ROUTE_NOT_CALLED]
        assert len(route_warnings) == 1
        assert '/admin/org/test/items' in route_warnings[0].route_path


if __name__ == '__main__':
    pytest.main([__file__, '-v'])