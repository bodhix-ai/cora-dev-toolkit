"""
Auth Lifecycle Validator

Validates authorization patterns across Frontend and Lambda layers per ADR-019.
This module integrates with api-tracer to provide full-stack auth lifecycle validation.

Reference: docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md
"""

import ast
import re
import logging
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class AuthIssue:
    """Represents an authorization pattern issue."""
    severity: str  # 'error' or 'warning'
    issue_type: str  # See AuthIssueType
    layer: str  # 'frontend', 'lambda', 'gateway'
    file: str
    line: int
    route_path: Optional[str] = None
    route_method: Optional[str] = None
    issue: str = ""
    suggestion: Optional[str] = None
    standard_ref: Optional[str] = None  # Reference to standard doc


class AuthIssueType:
    """
    Constants for auth issue types.
    
    Layer 1 (Admin Auth - ADR-019a/b): /admin/* routes
    Layer 2 (Resource Permissions - ADR-019c): /{module}/* data routes
    """
    # ============================================================================
    # LAYER 1: Admin Authorization (ADR-019a/b)
    # ============================================================================
    
    # Frontend issues (Layer 1)
    ADMIN_MISSING_USE_USER = 'auth_admin_missing_use_user'
    ADMIN_MISSING_USE_ROLE = 'auth_admin_missing_use_role'
    ADMIN_MISSING_ORG_CONTEXT = 'auth_admin_missing_org_context'
    ADMIN_MISSING_LOADING_CHECK = 'auth_admin_missing_loading_check'
    ADMIN_DIRECT_ROLE_ACCESS = 'auth_admin_direct_role_access'
    ADMIN_MISSING_ORG_ID_IN_API_CALL = 'auth_admin_missing_org_id_in_api_call'
    ADMIN_INVALID_HOOK_DESTRUCTURING = 'auth_admin_invalid_hook_destructuring'
    
    # Lambda issues (Layer 1)
    ADMIN_MISSING_CHECK_SYS_ADMIN = 'auth_admin_missing_check_sys_admin'
    ADMIN_MISSING_CHECK_ORG_ADMIN = 'auth_admin_missing_check_org_admin'
    ADMIN_MISSING_CHECK_WS_ADMIN = 'auth_admin_missing_check_ws_admin'
    ADMIN_MISSING_ORG_CONTEXT_EXTRACTION = 'auth_admin_missing_org_context_extraction'
    ADMIN_MISSING_EXTERNAL_UID_CONVERSION = 'auth_admin_missing_external_uid_conversion'
    ADMIN_DIRECT_JWT_ROLE_ACCESS = 'auth_admin_direct_jwt_role_access'
    ADMIN_AUTH_IN_HANDLER = 'auth_admin_auth_in_handler'
    ADMIN_DUPLICATE_AUTH_CHECK = 'auth_admin_duplicate_auth_check'
    
    # ============================================================================
    # LAYER 2: Resource Permissions (ADR-019c)
    # ============================================================================
    
    # Lambda issues (Layer 2)
    RESOURCE_MISSING_ORG_MEMBERSHIP_CHECK = 'auth_resource_missing_org_membership_check'
    RESOURCE_MISSING_OWNERSHIP_CHECK = 'auth_resource_missing_ownership_check'
    RESOURCE_ADMIN_ROLE_OVERRIDE = 'auth_resource_admin_role_override'
    RESOURCE_MISSING_SCOPE_BEFORE_PERMISSION = 'auth_resource_missing_scope_before_permission'
    
    # ============================================================================
    # BACKWARD COMPATIBILITY (Deprecated - use layer-prefixed names)
    # ============================================================================
    
    # Old names (deprecated but kept for backward compatibility)
    MISSING_USE_USER = 'missing_use_user'
    MISSING_USE_ROLE = 'missing_use_role'
    MISSING_ORG_CONTEXT = 'missing_org_context'
    MISSING_LOADING_CHECK = 'missing_loading_check'
    DIRECT_ROLE_ACCESS = 'direct_role_access'
    MISSING_ORG_ID_IN_API_CALL = 'missing_org_id_in_api_call'
    INVALID_HOOK_DESTRUCTURING = 'invalid_hook_destructuring'
    MISSING_CHECK_SYS_ADMIN = 'missing_check_sys_admin'
    MISSING_CHECK_ORG_ADMIN = 'missing_check_org_admin'
    MISSING_CHECK_WS_ADMIN = 'missing_check_ws_admin'
    MISSING_ORG_CONTEXT_EXTRACTION = 'missing_org_context_extraction'
    MISSING_EXTERNAL_UID_CONVERSION = 'missing_external_uid_conversion'
    DIRECT_JWT_ROLE_ACCESS = 'direct_jwt_role_access'
    AUTH_IN_HANDLER = 'auth_in_handler'
    DUPLICATE_AUTH_CHECK = 'duplicate_auth_check'


class FrontendAuthValidator:
    """
    Validates frontend authorization patterns per ADR-019a.
    
    Checks:
    - useUser() hook usage
    - useRole() hook for admin pages
    - useOrganizationContext() for org routes
    - Loading state checks before role access
    """
    
    def __init__(self):
        self.issues: List[AuthIssue] = []
        self.current_file: str = ""
    
    def validate_file(self, file_path: str, content: str) -> List[AuthIssue]:
        """
        Validate a TypeScript/TSX file for auth patterns.
        
        Args:
            file_path: Path to the file
            content: File content
            
        Returns:
            List of AuthIssue objects
        """
        self.current_file = file_path
        self.issues = []
        
        # Check API client files for orgId in org admin routes
        if 'lib/api.ts' in file_path or 'lib/api.tsx' in file_path:
            self._check_org_id_in_api_calls(content)
            return self.issues
        
        # Determine route type from file path
        route_type = self._detect_route_type(file_path)
        
        if route_type == 'none':
            # Not an admin page, no auth requirements
            return []
        
        # Check for required hooks
        self._check_use_user(content, route_type)
        self._check_use_role(content, route_type)
        self._check_org_context(content, route_type)
        self._check_loading_state(content, route_type)
        self._check_direct_role_access(content)
        
        return self.issues
    
    def _detect_route_type(self, file_path: str) -> str:
        """
        Detect route type from file path.
        
        Returns:
            'sys' for /admin/sys/* routes
            'org' for /admin/org/* routes
            'ws' for /admin/ws/* routes
            'none' for non-admin routes
        """
        path_lower = file_path.lower()
        
        # Check for admin routes in app directory structure
        # e.g., app/admin/sys/... or app/admin/platform/...
        if '/admin/sys/' in path_lower or '/admin/platform/' in path_lower:
            return 'sys'
        elif '/admin/org/' in path_lower:
            return 'org'
        elif '/admin/ws/' in path_lower or '/workspace/' in path_lower:
            return 'ws'
        
        # Also check for explicit route patterns in page.tsx files
        if 'page.tsx' in path_lower or 'page.ts' in path_lower:
            # Check parent directory name
            parent = Path(file_path).parent.name.lower()
            if parent in ['platform', 'system', 'sys']:
                return 'sys'
            elif parent in ['org', 'organization', 'organizations']:
                return 'org'
            elif parent in ['ws', 'workspace', 'workspaces']:
                return 'ws'
        
        return 'none'
    
    def _check_use_user(self, content: str, route_type: str):
        """Check for useUser() hook usage."""
        # Pattern: import or call useUser
        has_use_user = (
            'useUser' in content or
            'useSession' in content  # NextAuth pattern
        )
        
        if not has_use_user and route_type != 'none':
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_MISSING_USE_USER,
                layer='frontend',
                file=self.current_file,
                line=1,
                issue="Admin page missing useUser() or useSession() hook",
                suggestion="Add: const { user, isLoading } = useUser() or useSession()",
                standard_ref="ADR-019a"
            ))
    
    def _check_use_role(self, content: str, route_type: str):
        """Check for useRole() hook in admin pages."""
        has_use_role = 'useRole' in content
        
        # For sys admin pages, useRole is required
        if route_type == 'sys' and not has_use_role:
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_MISSING_USE_ROLE,
                layer='frontend',
                file=self.current_file,
                line=1,
                issue="System admin page missing useRole() hook",
                suggestion="Add: const { isSysAdmin } = useRole() - useRole returns { role, hasPermission, isSysAdmin, isOrgAdmin }",
                standard_ref="ADR-019a"
            ))
        
        # For org admin pages, useRole is required for role check
        if route_type == 'org' and not has_use_role:
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_MISSING_USE_ROLE,
                layer='frontend',
                file=self.current_file,
                line=1,
                issue="Organization admin page missing useRole() hook",
                suggestion="Add: const { isOrgAdmin } = useRole() - useRole returns { role, hasPermission, isSysAdmin, isOrgAdmin }",
                standard_ref="ADR-019a"
            ))
        
        # Check for invalid useRole destructuring (if useRole is present)
        if has_use_role:
            self._check_use_role_destructuring(content)
    
    def _check_org_context(self, content: str, route_type: str):
        """Check for useOrganizationContext() in org admin pages."""
        has_org_context = (
            'useOrganizationContext' in content or
            'useOrgContext' in content or
            'OrgContext' in content
        )
        
        if route_type == 'org' and not has_org_context:
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_MISSING_ORG_CONTEXT,
                layer='frontend',
                file=self.current_file,
                line=1,
                issue="Organization admin page missing useOrganizationContext() hook",
                suggestion="Add: const { orgId, organization } = useOrganizationContext()",
                standard_ref="ADR-019a"
            ))
    
    def _check_loading_state(self, content: str, route_type: str):
        """Check for loading state checks before role access."""
        has_loading_check = (
            'isLoading' in content or
            'loading' in content.lower() or
            'status === "loading"' in content or
            'status === \'loading\'' in content
        )
        
        if route_type != 'none' and not has_loading_check:
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_MISSING_LOADING_CHECK,
                layer='frontend',
                file=self.current_file,
                line=1,
                issue="Admin page may not check loading state before accessing role",
                suggestion="Ensure loading state is checked: if (isLoading) return <LoadingSpinner />",
                standard_ref="ADR-019a"
            ))
    
    def _check_use_role_destructuring(self, content: str):
        """
        Check that useRole() destructuring uses valid properties.
        
        Valid properties: role, hasPermission, isSysAdmin, isOrgAdmin
        Invalid properties: sysRole, orgRole, isLoading, loading, etc.
        """
        # Pattern to find useRole destructuring: const { ... } = useRole()
        pattern = r'const\s*\{\s*([^}]+)\s*\}\s*=\s*useRole\s*\(\s*\)'
        
        match = re.search(pattern, content)
        if not match:
            return
        
        destructured = match.group(1)
        line = content[:match.start()].count('\n') + 1
        
        # Valid properties from useRole hook
        valid_props = {'role', 'hasPermission', 'isSysAdmin', 'isOrgAdmin'}
        
        # Common invalid properties (mistakes)
        invalid_props = {
            'sysRole': 'isSysAdmin (boolean)',
            'orgRole': 'isOrgAdmin (boolean)', 
            'isLoading': 'useRole does not return isLoading - use useUser().loading instead',
            'loading': 'useRole does not return loading - use useUser().loading instead',
            'roleLoading': 'useRole does not return roleLoading - use useUser().loading instead',
        }
        
        # Parse the destructured properties
        # Handle: prop, prop: alias, and nested destructuring
        props = []
        for part in destructured.split(','):
            part = part.strip()
            if ':' in part:
                # prop: alias - get the prop name (left side)
                prop = part.split(':')[0].strip()
            else:
                prop = part
            if prop:
                props.append(prop)
        
        # Check each property
        for prop in props:
            if prop in invalid_props:
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_INVALID_HOOK_DESTRUCTURING,
                    layer='frontend',
                    file=self.current_file,
                    line=line,
                    issue=f"Invalid useRole() destructuring: '{prop}' is not returned by useRole()",
                    suggestion=f"useRole() returns {{ role, hasPermission, isSysAdmin, isOrgAdmin }}. Use {invalid_props[prop]}",
                    standard_ref="ADR-019a"
                ))
            elif prop not in valid_props and not prop.startswith('_'):  # Allow _ for ignored vars
                # Unknown property - warn
                self.issues.append(AuthIssue(
                    severity='warning',
                    issue_type=AuthIssueType.ADMIN_INVALID_HOOK_DESTRUCTURING,
                    layer='frontend',
                    file=self.current_file,
                    line=line,
                    issue=f"Unknown useRole() property: '{prop}' - verify this is a valid return value",
                    suggestion=f"useRole() returns {{ role, hasPermission, isSysAdmin, isOrgAdmin }}",
                    standard_ref="ADR-019a"
                ))

    def _check_orgs_path_parameter_antipattern(self, content: str):
        """
        Check for anti-pattern: /orgs/${orgId}/... (path parameter instead of query parameter).
        
        Per ADR-019a: Org admin routes should use /admin/org/*?orgId= pattern.
        Using /orgs/${orgId}/... bypasses centralized authorization checks.
        """
        # Pattern to detect /orgs/${orgId}/... or '/orgs/' + orgId template literal
        patterns = [
            r'["\']\/orgs\/\$\{orgId\}\/[^"\']*["\']',  # `/orgs/${orgId}/...`
            r'`\/orgs\/\$\{orgId\}\/[^`]*`',            # Template literal with /orgs/${orgId}/
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                line = content[:match.start()].count('\n') + 1
                route = match.group(0).strip('"\'`')
                
                # Extract the path after /orgs/${orgId}/
                # e.g., /orgs/${orgId}/ai/config -> /admin/org/ai/config
                path_match = re.search(r'/orgs/\$\{orgId\}/(.+)', route)
                suggested_route = f"/admin/org/{path_match.group(1)}?orgId=${{orgId}}" if path_match else "/admin/org/*?orgId=${orgId}"
                
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_MISSING_ORG_ID_IN_API_CALL,
                    layer='frontend',
                    file=self.current_file,
                    line=line,
                    route_path=route,
                    issue=f"API call uses wrong endpoint pattern: '{route}' - should use /admin/org/* with orgId query param",
                    suggestion=f"Change to: `{suggested_route}` (query parameter, not path parameter)",
                    standard_ref="ADR-019a"
                ))
    
    def _check_direct_role_access(self, content: str):
        """Check for anti-pattern: directly accessing role from JWT/token."""
        # Pattern: accessing role directly from token/claims
        anti_patterns = [
            r'token\.role',
            r'claims\.role',
            r'jwt\.role',
            r'accessToken.*role',
            r'session\.user\.role(?!\s*:)',  # Avoid false positive on type definitions
        ]
        
        for pattern in anti_patterns:
            match = re.search(pattern, content)
            if match:
                # Find line number
                line = content[:match.start()].count('\n') + 1
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_DIRECT_ROLE_ACCESS,
                    layer='frontend',
                    file=self.current_file,
                    line=line,
                    issue="Direct role access from JWT/token detected (roles are NOT in JWT)",
                    suggestion="Use useRole() hook which queries the database for roles",
                    standard_ref="ADR-019"
                ))
                break
    
    def _check_org_id_in_api_calls(self, content: str):
        """
        Check that frontend API functions calling /admin/org/* routes include orgId.
        
        Per ADR-019a: All org admin API calls MUST include orgId as a query parameter.
        This ensures the Lambda can extract org context for authorization.
        
        Patterns to detect:
        1. Traditional: export async function name(...) { ... '/admin/org/' ... }
        2. Arrow in object: listKbs: () => client.get('/admin/org/kb/bases')
        3. Arrow assigned: const listKbs = () => client.get('/admin/org/...')
        
        Check: URL must contain ?orgId= or orgId in function parameters/URL template
        
        Also detects anti-pattern:
        - /orgs/${orgId}/... (path parameter instead of query parameter)
        """
        lines = content.split('\n')
        
        # First, check for anti-pattern: /orgs/${orgId}/... (path parameter)
        # This is WRONG per ADR-019 - should use /admin/org/*?orgId= instead
        self._check_orgs_path_parameter_antipattern(content)
        
        # Pattern 1: Traditional async function exports
        current_function = None
        current_function_start = 0
        current_function_content = []
        brace_count = 0
        in_function = False
        
        for i, line in enumerate(lines, 1):
            # Detect function start
            func_match = re.match(r'^export\s+async\s+function\s+(\w+)', line)
            if func_match:
                current_function = func_match.group(1)
                current_function_start = i
                current_function_content = [line]
                brace_count = line.count('{') - line.count('}')
                in_function = brace_count > 0
                continue
            
            if in_function:
                current_function_content.append(line)
                brace_count += line.count('{') - line.count('}')
                
                if brace_count <= 0:
                    # Function ended, analyze it
                    func_content = '\n'.join(current_function_content)
                    
                    # Check if this function calls /admin/org/ routes
                    if '/admin/org/' in func_content:
                        # Check if orgId is passed to buildUrl or included in params
                        has_org_id = (
                            'orgId' in func_content or
                            'org_id' in func_content
                        )
                        
                        if not has_org_id:
                            # Find the specific route being called
                            route_match = re.search(r'["\'](/admin/org/[^"\']+)["\']', func_content)
                            route = route_match.group(1) if route_match else '/admin/org/*'
                            
                            self.issues.append(AuthIssue(
                                severity='error',
                                issue_type=AuthIssueType.MISSING_ORG_ID_IN_API_CALL,
                                layer='frontend',
                                file=self.current_file,
                                line=current_function_start,
                                route_path=route,
                                issue=f"API function '{current_function}' calls org admin route without orgId parameter",
                                suggestion=f"Add orgId parameter: function {current_function}(token: string, orgId: string, ...) and include {{ orgId }} in buildUrl() params",
                                standard_ref="ADR-019a"
                            ))
                    
                    in_function = False
                    current_function = None
        
        # Pattern 2: Arrow functions in object literals
        # e.g., listKbs: () => client.get('/admin/org/kb/bases')
        # Matches: propertyName: (...) => ...('/admin/org/...')
        arrow_pattern = r'(\w+)\s*:\s*\([^)]*\)\s*=>\s*[^,\n]*["\'](/admin/org/[^"\']+)["\']'
        
        for match in re.finditer(arrow_pattern, content):
            func_name = match.group(1)
            route = match.group(2)
            line = content[:match.start()].count('\n') + 1
            
            # Check if orgId is in the URL (either as query param or template)
            url_part = content[match.start():match.end()]
            has_org_id = (
                '?orgId=' in url_part or
                '${orgId}' in url_part or
                'orgId' in match.group(0)  # Check full match
            )
            
            if not has_org_id:
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.MISSING_ORG_ID_IN_API_CALL,
                    layer='frontend',
                    file=self.current_file,
                    line=line,
                    route_path=route,
                    issue=f"API method '{func_name}' calls org admin route '{route}' without orgId parameter",
                    suggestion=f"Add orgId to URL: `{route}?orgId=${{orgId}}` and add orgId as first function parameter",
                    standard_ref="ADR-019a"
                ))


class LambdaAuthValidator:
    """
    Validates Lambda authorization patterns per ADR-019b.
    
    Checks:
    - check_sys_admin() usage for /admin/sys/* routes
    - check_org_admin() usage for /admin/org/* routes
    - check_ws_admin() usage for /admin/ws/* routes
    - get_org_context_from_event() for org routes
    - External UID → Supabase UUID conversion
    - Anti-pattern: No direct JWT role access
    """
    
    def __init__(self):
        self.issues: List[AuthIssue] = []
        self.current_file: str = ""
        # Store extracted routes for attribution
        self.sys_routes: List[Tuple[str, str]] = []  # (method, path)
        self.org_routes: List[Tuple[str, str]] = []
        self.ws_routes: List[Tuple[str, str]] = []
    
    def validate_file(self, file_path: str, content: str) -> List[AuthIssue]:
        """
        Validate a Python Lambda file for auth patterns.
        
        Args:
            file_path: Path to the file
            content: File content
            
        Returns:
            List of AuthIssue objects
        """
        self.current_file = file_path
        self.issues = []
        self.sys_routes = []
        self.org_routes = []
        self.ws_routes = []
        
        try:
            tree = ast.parse(content, filename=file_path)
        except SyntaxError as e:
            logger.warning(f"Syntax error parsing {file_path}: {e}")
            return []
        
        # Detect route types and extract actual route paths from docstring
        route_types = self._detect_route_types(tree, content)
        self._extract_routes_from_docstring(tree, content)
        
        if not route_types:
            # Not an admin Lambda, no auth requirements
            return []
        
        # Check for required auth patterns
        self._check_external_uid_conversion(tree, content)
        self._check_sys_admin_auth(tree, content, route_types)
        self._check_org_admin_auth(tree, content, route_types)
        self._check_ws_admin_auth(tree, content, route_types)
        self._check_direct_jwt_access(tree, content)
        self._check_centralized_auth(tree, content)
        
        return self.issues
    
    def _detect_route_types(self, tree: ast.AST, content: str) -> Set[str]:
        """
        Detect which admin route types this Lambda handles.
        
        Returns:
            Set of route types: 'sys', 'org', 'ws'
        """
        route_types = set()
        
        # Check module docstring for route definitions
        docstring = ast.get_docstring(tree) or ""
        
        # Also check lambda_handler docstring
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == 'lambda_handler':
                handler_doc = ast.get_docstring(node) or ""
                docstring += "\n" + handler_doc
        
        # Look for route patterns in docstring
        if '/admin/sys/' in docstring or '/admin/platform/' in docstring:
            route_types.add('sys')
        if '/admin/org/' in docstring:
            route_types.add('org')
        if '/admin/ws/' in docstring:
            route_types.add('ws')
        
        # Also check string literals in code
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                path = node.value
                if '/admin/sys/' in path or '/admin/platform/' in path:
                    route_types.add('sys')
                if '/admin/org/' in path:
                    route_types.add('org')
                if '/admin/ws/' in path:
                    route_types.add('ws')
        
        return route_types
    
    def _extract_routes_from_docstring(self, tree: ast.AST, content: str):
        """
        Extract actual route paths from docstring and categorize by type.
        
        Parses docstring format:
        - GET /admin/org/chat/config - Description
        - POST /admin/sys/users - Description
        
        Populates self.sys_routes, self.org_routes, self.ws_routes
        """
        # Get combined docstring
        docstring = ast.get_docstring(tree) or ""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == 'lambda_handler':
                handler_doc = ast.get_docstring(node) or ""
                docstring += "\n" + handler_doc
        
        # Pattern matches: - GET /path/here - Description
        # Also matches: - GET /path/here
        pattern = r'-\s+(GET|POST|PUT|DELETE|PATCH)\s+(/\S+)'
        
        for match in re.finditer(pattern, docstring):
            method = match.group(1)
            path = match.group(2)
            
            # Categorize by route type
            if '/admin/sys/' in path or '/admin/platform/' in path:
                self.sys_routes.append((method, path))
            elif '/admin/org/' in path:
                self.org_routes.append((method, path))
            elif '/admin/ws/' in path:
                self.ws_routes.append((method, path))
    
    def _check_external_uid_conversion(self, tree: ast.AST, content: str):
        """Check for external UID to Supabase UUID conversion."""
        # Required patterns for UID conversion
        has_conversion = (
            'get_supabase_user_id' in content or
            'get_user_from_event' in content or
            'user_auth_ext_ids' in content or
            'external_uid' in content
        )
        
        # Check if this file handles any admin routes
        handles_admin = any(admin in content for admin in ['/admin/', 'admin/sys', 'admin/org', 'admin/ws'])
        
        if handles_admin and not has_conversion:
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_MISSING_EXTERNAL_UID_CONVERSION,
                layer='lambda',
                file=self.current_file,
                line=1,
                issue="Admin Lambda missing external UID → Supabase UUID conversion",
                suggestion="Add: user_id = common.get_supabase_user_id(event) to convert Okta UID to Supabase UUID",
                standard_ref="ADR-019b"
            ))
    
    def _check_sys_admin_auth(self, tree: ast.AST, content: str, route_types: Set[str]):
        """Check for check_sys_admin() usage in sys admin routes."""
        if 'sys' not in route_types:
            return
        
        has_sys_check = (
            'check_sys_admin' in content or
            'is_sys_admin' in content
        )
        
        if not has_sys_check:
            # Find where sys routes are defined
            line = self._find_route_line(content, '/admin/sys/')
            
            # Create one error per route for clear attribution
            if self.sys_routes:
                for method, path in self.sys_routes:
                    self.issues.append(AuthIssue(
                        severity='error',
                        issue_type=AuthIssueType.ADMIN_MISSING_CHECK_SYS_ADMIN,
                        layer='lambda',
                        file=self.current_file,
                        line=line,
                        route_path=path,
                        route_method=method,
                        issue=f"System admin route missing check_sys_admin() authorization",
                        suggestion="Add: if not common.check_sys_admin(user_id): return common.forbidden_response('System admin required')",
                        standard_ref="ADR-019b"
                    ))
            else:
                # Fallback to file-level error if no routes extracted
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_MISSING_CHECK_SYS_ADMIN,
                    layer='lambda',
                    file=self.current_file,
                    line=line,
                    issue="System admin route missing check_sys_admin() authorization",
                    suggestion="Add: if not common.check_sys_admin(user_id): return common.forbidden_response('System admin required')",
                    standard_ref="ADR-019b"
                ))
    
    def _check_org_admin_auth(self, tree: ast.AST, content: str, route_types: Set[str]):
        """Check for check_org_admin() usage in org admin routes."""
        if 'org' not in route_types:
            return
        
        has_org_check = (
            'check_org_admin' in content or
            'is_org_admin' in content
        )
        
        has_org_context = (
            'get_org_context_from_event' in content or
            'get_org_id' in content or
            "['orgId']" in content or
            '["orgId"]' in content
        )
        
        line = self._find_route_line(content, '/admin/org/')
        
        if not has_org_check:
            # Create one error per route for clear attribution
            if self.org_routes:
                for method, path in self.org_routes:
                    self.issues.append(AuthIssue(
                        severity='error',
                        issue_type=AuthIssueType.ADMIN_MISSING_CHECK_ORG_ADMIN,
                        layer='lambda',
                        file=self.current_file,
                        line=line,
                        route_path=path,
                        route_method=method,
                        issue=f"Organization admin route missing check_org_admin() authorization",
                        suggestion="Add: if not common.check_org_admin(user_id, org_id): return common.forbidden_response('Org admin required')",
                        standard_ref="ADR-019b"
                    ))
            else:
                # Fallback to file-level error if no routes extracted
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_MISSING_CHECK_ORG_ADMIN,
                    layer='lambda',
                    file=self.current_file,
                    line=line,
                    issue="Organization admin route missing check_org_admin() authorization",
                    suggestion="Add: if not common.check_org_admin(user_id, org_id): return common.forbidden_response('Org admin required')",
                    standard_ref="ADR-019b"
                ))
        
        if not has_org_context:
            # Create one error per route for clear attribution
            if self.org_routes:
                for method, path in self.org_routes:
                    self.issues.append(AuthIssue(
                        severity='error',
                        issue_type=AuthIssueType.ADMIN_MISSING_ORG_CONTEXT_EXTRACTION,
                        layer='lambda',
                        file=self.current_file,
                        line=line,
                        route_path=path,
                        route_method=method,
                        issue=f"Organization admin route missing org context extraction",
                        suggestion="Add: org_id = common.get_org_context_from_event(event)",
                        standard_ref="ADR-019b"
                    ))
            else:
                # Fallback to file-level error if no routes extracted
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_MISSING_ORG_CONTEXT_EXTRACTION,
                    layer='lambda',
                    file=self.current_file,
                    line=line,
                    issue="Organization admin route missing org context extraction",
                    suggestion="Add: org_id = common.get_org_context_from_event(event)",
                    standard_ref="ADR-019b"
                ))
    
    def _check_ws_admin_auth(self, tree: ast.AST, content: str, route_types: Set[str]):
        """Check for check_ws_admin() usage in ws admin routes."""
        if 'ws' not in route_types:
            return
        
        has_ws_check = (
            'check_ws_admin' in content or
            'is_ws_admin' in content
        )
        
        if not has_ws_check:
            line = self._find_route_line(content, '/admin/ws/')
            
            # Create one error per route for clear attribution
            if self.ws_routes:
                for method, path in self.ws_routes:
                    self.issues.append(AuthIssue(
                        severity='error',
                        issue_type=AuthIssueType.ADMIN_MISSING_CHECK_WS_ADMIN,
                        layer='lambda',
                        file=self.current_file,
                        line=line,
                        route_path=path,
                        route_method=method,
                        issue=f"Workspace admin route missing check_ws_admin() authorization",
                        suggestion="Add: if not common.check_ws_admin(user_id, ws_id): return common.forbidden_response('Workspace admin required')",
                        standard_ref="ADR-019b"
                    ))
            else:
                # Fallback to file-level error if no routes extracted
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_MISSING_CHECK_WS_ADMIN,
                    layer='lambda',
                    file=self.current_file,
                    line=line,
                    issue="Workspace admin route missing check_ws_admin() authorization",
                    suggestion="Add: if not common.check_ws_admin(user_id, ws_id): return common.forbidden_response('Workspace admin required')",
                    standard_ref="ADR-019b"
                ))
    
    def _check_direct_jwt_access(self, tree: ast.AST, content: str):
        """Check for anti-pattern: directly accessing role from JWT claims."""
        # Anti-patterns for direct JWT role access
        anti_patterns = [
            r"authorizer.*\['role'\]",
            r"authorizer.*\[\"role\"\]",
            r'claims.*\.role',
            r"jwt.*\['role'\]",
            r"user_info.*\['role'\](?!.*#\s*OK)",  # Allow with # OK comment
            r'token.*\.role',
        ]
        
        for pattern in anti_patterns:
            match = re.search(pattern, content)
            if match:
                line = content[:match.start()].count('\n') + 1
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.ADMIN_DIRECT_JWT_ROLE_ACCESS,
                    layer='lambda',
                    file=self.current_file,
                    line=line,
                    issue="Direct JWT role access detected (roles are NOT in JWT - they're in database)",
                    suggestion="Use check_*_admin() helpers which query the database for roles",
                    standard_ref="ADR-019"
                ))
                break
    
    def _check_centralized_auth(self, tree: ast.AST, content: str):
        """
        Check for centralized router auth pattern.
        
        Good pattern: Auth at router level (lambda_handler)
        Bad pattern: Auth duplicated in each handler function
        """
        # Count auth checks
        auth_check_count = 0
        auth_check_locations = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                func_content = ast.get_source_segment(content, node) if hasattr(ast, 'get_source_segment') else ""
                
                # Check for auth patterns in this function
                auth_patterns = ['check_sys_admin', 'check_org_admin', 'check_ws_admin', 
                                'is_sys_admin', 'is_org_admin', 'is_ws_admin']
                
                for pattern in auth_patterns:
                    if pattern in func_content:
                        auth_check_count += 1
                        auth_check_locations.append(node.name)
        
        # If auth checks are in multiple LEAF handler functions, it's not centralized
        # Exclude sub-router functions which legitimately have auth at their entry point
        sub_router_patterns = ['handle_workspace_', 'handle_chat_', 'handle_org_admin', 
                               'handle_sys_admin', 'handle_ws_admin', 'route_']
        leaf_handlers = [loc for loc in auth_check_locations 
                        if loc.startswith('handle_') 
                        and not any(loc.startswith(p) for p in sub_router_patterns)]
        
        if len(leaf_handlers) > 1:
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_AUTH_IN_HANDLER,
                layer='lambda',
                file=self.current_file,
                line=1,
                issue=f"Auth checks in multiple leaf handler functions ({', '.join(leaf_handlers)}). Consider centralizing in router.",
                suggestion="Move auth checks to lambda_handler() router level per ADR-019 Centralized Router Auth pattern",
                standard_ref="ADR-019b"
            ))
        
        # Check for duplicate auth checks (same check appearing multiple times)
        # Threshold of 6 allows for Lambdas with multiple route categories (org/sys/ws each with auth)
        if auth_check_count > 6:  # More than 6 suggests actual duplication
            self.issues.append(AuthIssue(
                severity='error',
                issue_type=AuthIssueType.ADMIN_DUPLICATE_AUTH_CHECK,
                layer='lambda',
                file=self.current_file,
                line=1,
                issue=f"Found {auth_check_count} auth checks in file. This suggests duplication (expected ≤6 for multi-category routers).",
                suggestion="Centralize auth at router level to avoid duplication",
                standard_ref="ADR-019b"
            ))
    
    def _find_route_line(self, content: str, route_pattern: str) -> int:
        """Find the line number where a route pattern appears."""
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            if route_pattern in line:
                return i
        return 1


class ResourcePermissionValidator:
    """
    Validates resource permission patterns per ADR-019c.
    
    Checks:
    - Org/workspace membership validation before resource access
    - Resource ownership/permission checks (can_*, is_*_owner)
    - No admin role override in data routes
    - Scope validation before permission checks
    """
    
    def __init__(self):
        self.issues: List[AuthIssue] = []
        self.current_file: str = ""
    
    def validate_file(self, file_path: str, content: str) -> List[AuthIssue]:
        """
        Validate a Python Lambda file for resource permission patterns.
        
        Args:
            file_path: Path to the file
            content: File content
            
        Returns:
            List of AuthIssue objects
        """
        self.current_file = file_path
        self.issues = []
        
        try:
            tree = ast.parse(content, filename=file_path)
        except SyntaxError as e:
            logger.warning(f"Syntax error parsing {file_path}: {e}")
            return []
        
        # Detect data routes (non-admin routes)
        data_routes = self._detect_data_routes(tree, content)
        
        if not data_routes:
            # Not a data route Lambda, no resource permission requirements
            return []
        
        # Check for required patterns
        self._check_org_membership_validation(tree, content, data_routes)
        self._check_resource_permission_functions(tree, content, data_routes)
        self._check_admin_role_override(tree, content, data_routes)
        
        return self.issues
    
    def _detect_data_routes(self, tree: ast.AST, content: str) -> List[Tuple[str, str]]:
        """
        Detect data routes (non-admin routes) from docstring.
        
        Returns:
            List of (method, path) tuples for data routes
        """
        data_routes = []
        
        # Get combined docstring
        docstring = ast.get_docstring(tree) or ""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == 'lambda_handler':
                handler_doc = ast.get_docstring(node) or ""
                docstring += "\n" + handler_doc
        
        # Pattern matches: - GET /path/here - Description
        pattern = r'-\s+(GET|POST|PUT|DELETE|PATCH)\s+(/\S+)'
        
        for match in re.finditer(pattern, docstring):
            method = match.group(1)
            path = match.group(2)
            
            # Skip admin routes
            if '/admin/' not in path:
                data_routes.append((method, path))
        
        return data_routes
    
    def _check_org_membership_validation(self, tree: ast.AST, content: str, data_routes: List[Tuple[str, str]]):
        """
        Check that org/workspace membership is validated before resource access.
        
        Per ADR-019c: Must call is_org_member() or can_access_org_resource()
        before accessing org-scoped resources.
        
        Platform-level routes (without {orgId} or {wsId} in path) are exempt.
        """
        # Check for org membership functions
        has_org_membership = (
            'is_org_member' in content or
            'can_access_org_resource' in content or
            'is_ws_member' in content or
            'can_access_ws_resource' in content
        )
        
        if data_routes and not has_org_membership:
            # Data routes exist but no membership validation
            # Filter out platform-level routes that don't require org membership
            for method, path in data_routes:
                # Skip platform-level routes
                if self._is_platform_level_route(path):
                    continue
                
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.RESOURCE_MISSING_ORG_MEMBERSHIP_CHECK,
                    layer='lambda',
                    file=self.current_file,
                    line=1,
                    route_path=path,
                    route_method=method,
                    issue=f"Data route {method} {path} missing org/workspace membership validation",
                    suggestion="Add: if not common.can_access_org_resource(user_id, org_id): return common.forbidden_response('Not a member')",
                    standard_ref="ADR-019c"
                ))
    
    def _check_resource_permission_functions(self, tree: ast.AST, content: str, data_routes: List[Tuple[str, str]]):
        """
        Check for resource permission functions (can_*, is_*_owner).
        
        Per ADR-019c: Resource routes must check ownership or permissions.
        
        Platform-level routes use different permission patterns (e.g., can_edit_profile for self-service).
        """
        # Check for permission functions
        has_permission_check = (
            re.search(r'can_\w+\(', content) or
            re.search(r'is_\w+_owner\(', content) or
            'can_access_' in content or
            'can_edit_' in content or
            'can_view_' in content
        )
        
        if data_routes and not has_permission_check:
            # Data routes exist but no permission checks
            # Filter out platform-level routes that have different permission patterns
            for method, path in data_routes:
                # Skip platform-level routes (they use self-service permission checks)
                if self._is_platform_level_route(path):
                    continue
                
                self.issues.append(AuthIssue(
                    severity='error',
                    issue_type=AuthIssueType.RESOURCE_MISSING_OWNERSHIP_CHECK,
                    layer='lambda',
                    file=self.current_file,
                    line=1,
                    route_path=path,
                    route_method=method,
                    issue=f"Data route {method} {path} missing resource permission check",
                    suggestion="Add: if not can_access_<resource>(user_id, resource_id): return common.forbidden_response('Access denied')",
                    standard_ref="ADR-019c"
                ))
    
    def _is_platform_level_route(self, path: str) -> bool:
        """
        Check if a route is platform-level (not org-scoped).
        
        Platform-level routes:
        - Self-service routes: /profiles/me, /users/me
        - Provisioning routes: /identities/provision
        - Routes without {orgId} or {wsId} in path
        
        Returns:
            True if route is platform-level, False if org-scoped
        """
        # Self-service routes (user accessing own data)
        platform_patterns = [
            r'/profiles/me',
            r'/users/me',
            r'/identities/provision',
        ]
        
        for pattern in platform_patterns:
            if re.search(pattern, path):
                return True
        
        # Check if route has org/workspace scope in path
        has_org_scope = (
            '{orgId}' in path or
            '{org_id}' in path or
            '{wsId}' in path or
            '{ws_id}' in path or
            '{workspaceId}' in path
        )
        
        # If no org/workspace scope in path, it's platform-level
        return not has_org_scope
    
    def _check_admin_role_override(self, tree: ast.AST, content: str, data_routes: List[Tuple[str, str]]):
        """
        Check for admin role override anti-pattern in data routes.
        
        Per ADR-019c: Admin roles do NOT provide automatic access to user resources.
        
        Platform-level routes are exempt (they may legitimately check admin roles).
        """
        # Check if admin checks are used in data routes
        # This is an anti-pattern - admin roles shouldn't bypass resource permissions
        has_admin_check = (
            'check_sys_admin' in content or
            'check_org_admin' in content or
            'check_ws_admin' in content or
            'is_sys_admin' in content or
            'is_org_admin' in content
        )
        
        # If we have data routes AND admin checks, this might be an override pattern
        if data_routes and has_admin_check:
            # Check if admin check is used as permission bypass
            # Pattern: if is_*_admin(...): return success
            admin_override_patterns = [
                r'if.*check_sys_admin.*:.*return.*success',
                r'if.*is_sys_admin.*:.*return',
                r'if.*check_org_admin.*:.*return.*success',
                r'if.*is_org_admin.*:.*return',
            ]
            
            for pattern in admin_override_patterns:
                if re.search(pattern, content, re.DOTALL):
                    for method, path in data_routes:
                        # Skip platform-level routes (they may legitimately check admin roles)
                        if self._is_platform_level_route(path):
                            continue
                        
                        self.issues.append(AuthIssue(
                            severity='warning',
                            issue_type=AuthIssueType.RESOURCE_ADMIN_ROLE_OVERRIDE,
                            layer='lambda',
                            file=self.current_file,
                            line=1,
                            route_path=path,
                            route_method=method,
                            issue=f"Data route {method} {path} may use admin role as permission override",
                            suggestion="Admin roles should NOT provide automatic access to user resources. Use explicit permission grants instead (ADR-019c)",
                            standard_ref="ADR-019c"
                        ))
                    break


class AuthLifecycleValidator:
    """
    Full-stack auth lifecycle validator.
    
    Validates that auth patterns are consistent across Frontend → Gateway → Lambda
    per ADR-019.
    
    Layer 1: Admin Authorization (ADR-019a/b) - /admin/* routes
    Layer 2: Resource Permissions (ADR-019c) - /{module}/* data routes
    """
    
    def __init__(self):
        self.frontend_validator = FrontendAuthValidator()
        self.lambda_validator = LambdaAuthValidator()
        self.resource_validator = ResourcePermissionValidator()
        self.issues: List[AuthIssue] = []
    
    def validate_frontend_file(self, file_path: str, content: str) -> List[AuthIssue]:
        """Validate a frontend file."""
        return self.frontend_validator.validate_file(file_path, content)
    
    def validate_lambda_file(self, file_path: str, content: str, validate_layer2: bool = False) -> List[AuthIssue]:
        """
        Validate a Lambda file.
        
        Args:
            file_path: Path to the file
            content: File content
            validate_layer2: If True, also run Layer 2 (resource permission) validation
            
        Returns:
            List of AuthIssue objects
        """
        issues = []
        
        # Layer 1: Admin authorization validation
        issues.extend(self.lambda_validator.validate_file(file_path, content))
        
        # Layer 2: Resource permission validation
        if validate_layer2:
            issues.extend(self.resource_validator.validate_file(file_path, content))
        
        return issues
    
    def validate_auth_lifecycle(
        self, 
        frontend_files: Dict[str, str], 
        lambda_files: Dict[str, str],
        route_mappings: Dict[str, Dict]
    ) -> List[AuthIssue]:
        """
        Validate full auth lifecycle across all layers.
        
        Args:
            frontend_files: Dict of {file_path: content} for frontend files
            lambda_files: Dict of {file_path: content} for Lambda files
            route_mappings: Dict mapping routes to their frontend/lambda files
            
        Returns:
            List of all AuthIssue objects
        """
        all_issues = []
        
        # Validate frontend files
        for file_path, content in frontend_files.items():
            issues = self.validate_frontend_file(file_path, content)
            all_issues.extend(issues)
        
        # Validate Lambda files
        for file_path, content in lambda_files.items():
            issues = self.validate_lambda_file(file_path, content)
            all_issues.extend(issues)
        
        # TODO: Cross-layer validation using route_mappings
        # This would check that if frontend calls an admin route,
        # the Lambda has corresponding auth checks
        
        self.issues = all_issues
        return all_issues
    
    def get_issues_by_route(self, route: str) -> List[AuthIssue]:
        """Get all auth issues related to a specific route."""
        return [issue for issue in self.issues if issue.route_path == route]
    
    def get_issues_by_layer(self, layer: str) -> List[AuthIssue]:
        """Get all auth issues for a specific layer (frontend, lambda, gateway)."""
        return [issue for issue in self.issues if issue.layer == layer]
    
    def get_errors(self) -> List[AuthIssue]:
        """Get all error-level issues."""
        return [issue for issue in self.issues if issue.severity == 'error']
    
    def get_warnings(self) -> List[AuthIssue]:
        """Get all warning-level issues."""
        return [issue for issue in self.issues if issue.severity == 'warning']