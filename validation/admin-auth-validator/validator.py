"""Admin Auth Validator - Checks admin pages follow ADR-015 Pattern A and ADR-016 Org Admin Pattern."""

import re
from pathlib import Path
from typing import List, Dict, Any


class AdminAuthValidator:
    """Validates admin pages follow Pattern A authentication and org admin authorization (ADR-016)."""

    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.org_admin_pages_checked = 0
        
    def validate(self) -> Dict[str, Any]:
        """Run validation and return results."""
        # Find all admin pages
        admin_pages = self._find_admin_pages()
        
        for page_path in admin_pages:
            self._validate_page(page_path)
        
        return {
            "passed": len(self.errors) == 0,
            "errors": self.errors,
            "warnings": self.warnings,
            "summary": {
                "total_pages": len(admin_pages),
                "org_admin_pages": self.org_admin_pages_checked,
                "errors": len(self.errors),
                "warnings": len(self.warnings),
            }
        }
    
    def _find_admin_pages(self) -> List[Path]:
        """Find all admin page.tsx files."""
        pages = []
        
        # Look in apps/web/app/admin for project-stack
        web_admin = self.project_path / "apps" / "web" / "app" / "admin"
        if web_admin.exists():
            pages.extend(web_admin.rglob("page.tsx"))
        
        # Look in routes/admin for modules
        routes_admin = self.project_path / "routes" / "admin"
        if routes_admin.exists():
            pages.extend(routes_admin.rglob("page.tsx"))
        
        # For templates directory - search in template locations
        # Project stack template
        template_web_admin = self.project_path / "_project-stack-template" / "apps" / "web" / "app" / "admin"
        if template_web_admin.exists():
            pages.extend(template_web_admin.rglob("page.tsx"))
            # Also find client components like OrgAdminClientPage.tsx
            pages.extend(template_web_admin.rglob("*ClientPage.tsx"))
        
        # Module templates - core modules
        core_modules = self.project_path / "_modules-core"
        if core_modules.exists():
            for module_dir in core_modules.iterdir():
                if module_dir.is_dir():
                    routes_admin = module_dir / "routes" / "admin"
                    if routes_admin.exists():
                        pages.extend(routes_admin.rglob("page.tsx"))
        
        # Module templates - functional modules
        functional_modules = self.project_path / "_modules-functional"
        if functional_modules.exists():
            for module_dir in functional_modules.iterdir():
                if module_dir.is_dir():
                    routes_admin = module_dir / "routes" / "admin"
                    if routes_admin.exists():
                        pages.extend(routes_admin.rglob("page.tsx"))
        
        # Also support direct glob search for templates directory
        if self.project_path.name == "templates":
            # Use glob to find all admin pages
            pages.extend(self.project_path.glob("**/admin/**/page.tsx"))
            pages.extend(self.project_path.glob("**/admin/**/*ClientPage.tsx"))
            # Remove duplicates
            pages = list(set(pages))
        
        return pages
    
    def _validate_page(self, page_path: Path):
        """Validate a single admin page."""
        try:
            content = page_path.read_text()
            rel_path = str(page_path.relative_to(self.project_path))
            
            # Skip shell pages - they use server/client split pattern
            # These are server components that just render client components
            shell_page_patterns = [
                "apps/web/app/admin/sys/page.tsx",
                "apps/web/app/admin/org/page.tsx",
                "_project-stack-template/apps/web/app/admin/sys/page.tsx",
                "_project-stack-template/apps/web/app/admin/org/page.tsx"
            ]
            if rel_path in shell_page_patterns or rel_path.endswith("/admin/sys/page.tsx") or rel_path.endswith("/admin/org/page.tsx"):
                # Only skip if it's a shell page (renders a ClientPage component)
                if "ClientPage" in content or "ServerPage" in content or "import" in content and "Client" in content:
                    return  # Shell pages are exempt from Pattern A
            
            # Run org admin specific checks (ADR-016)
            if self._is_org_admin_page(rel_path):
                self._validate_org_admin_page(content, rel_path)
            
            # Check for Pattern A requirements
            has_use_user = bool(re.search(r'useUser\(\)', content))
            # More flexible loading check - accepts 'loading', 'userLoading', compound conditions, etc.
            has_loading_check = bool(re.search(r'if\s*\([^)]*\w*[Ll]oading\w*[^)]*\)', content))
            has_auth_check = bool(re.search(r'!isAuthenticated\s*\|\|\s*!profile', content))
            has_role_check = bool(re.search(r'(sys_owner|sys_admin|org_owner|org_admin)', content))
            has_circular_progress = bool(re.search(r'<CircularProgress\s*/?>', content))
            has_alert = bool(re.search(r'<Alert\s+severity=', content))
            
            # Check for anti-patterns
            has_use_session = bool(re.search(r'useSession\(\)', content))
            has_org_context = bool(re.search(r'useContext\(OrgContext\)', content))
            returns_null = bool(re.search(r'return\s+null;', content))
            
            # Report errors
            if not has_use_user:
                self.errors.append({
                    "file": rel_path,
                    "message": "Missing useUser() hook"
                })
            
            if has_use_user and not has_loading_check:
                self.errors.append({
                    "file": rel_path,
                    "message": "Missing loading state check"
                })
            
            if has_use_user and not has_auth_check:
                self.errors.append({
                    "file": rel_path,
                    "message": "Missing authentication check (isAuthenticated && profile)"
                })
            
            if has_use_user and not has_role_check:
                self.warnings.append({
                    "file": rel_path,
                    "message": "Missing explicit role check"
                })
            
            if has_loading_check and not has_circular_progress:
                self.warnings.append({
                    "file": rel_path,
                    "message": "Loading check doesn't use CircularProgress"
                })
            
            if (has_auth_check or has_role_check) and not has_alert:
                self.warnings.append({
                    "file": rel_path,
                    "message": "Auth/role checks don't use Alert component"
                })
            
            # Anti-patterns
            if has_use_session:
                self.errors.append({
                    "file": rel_path,
                    "message": "ANTI-PATTERN: Using useSession() from next-auth (deprecated)"
                })
            
            if has_org_context:
                self.errors.append({
                    "file": rel_path,
                    "message": "ANTI-PATTERN: Using OrgContext for auth instead of useUser()"
                })
            
            if returns_null:
                self.warnings.append({
                    "file": rel_path,
                    "message": "Returns null instead of error message"
                })
                
        except Exception as e:
                self.errors.append({
                    "file": str(page_path),
                    "message": f"Error reading file: {str(e)}"
                })
    
    def _is_org_admin_page(self, rel_path: str) -> bool:
        """Check if the file is an org admin page (subject to ADR-016)."""
        return "/admin/org/" in rel_path
    
    def _validate_org_admin_page(self, content: str, rel_path: str):
        """Validate org admin page follows ADR-016 authorization pattern."""
        self.org_admin_pages_checked += 1
        
        # Check for profile.orgRole usage (doesn't exist)
        if re.search(r'profile\??\.orgRole', content):
            line_num = self._find_line_number(content, r'profile\??\.orgRole')
            self.errors.append({
                "file": rel_path,
                "line": line_num,
                "message": "ADR-016: Usage of 'profile.orgRole' - field does not exist. Use useRole() hook.",
                "rule": "org-admin-auth/no-profile-orgRole"
            })
        
        # Check for profile.orgId usage (doesn't exist)
        if re.search(r'profile\??\.orgId(?!\w)', content):
            line_num = self._find_line_number(content, r'profile\??\.orgId(?!\w)')
            self.errors.append({
                "file": rel_path,
                "line": line_num,
                "message": "ADR-016: Usage of 'profile.orgId' - field does not exist. Use organization.orgId from useOrganizationContext().",
                "rule": "org-admin-auth/no-profile-orgId"
            })
        
        # Check for organization.id usage (should be orgId)
        if re.search(r'(?:organization|currentOrganization)\??\.id(?![A-Za-z])', content):
            line_num = self._find_line_number(content, r'organization\??\.id(?![A-Za-z])')
            self.errors.append({
                "file": rel_path,
                "line": line_num,
                "message": "ADR-016: Usage of 'organization.id' - UserOrganization uses 'orgId' not 'id'.",
                "rule": "org-admin-auth/use-orgId"
            })
        
        # Check for organization.name usage (should be orgName)
        if re.search(r'(?:organization|currentOrganization)\??\.name(?![A-Za-z])', content):
            line_num = self._find_line_number(content, r'organization\??\.name(?![A-Za-z])')
            self.errors.append({
                "file": rel_path,
                "line": line_num,
                "message": "ADR-016: Usage of 'organization.name' - UserOrganization uses 'orgName' not 'name'.",
                "rule": "org-admin-auth/use-orgName"
            })
        
        # Check for useRole hook (should be used for org admin checks)
        has_auth_check = 'isOrgAdmin' in content or 'org_admin' in content or 'org_owner' in content
        has_use_role = 'useRole' in content
        
        if has_auth_check and not has_use_role:
            self.warnings.append({
                "file": rel_path,
                "message": "ADR-016: Org admin page performs auth check without useRole() hook",
                "rule": "org-admin-auth/use-role-hook"
            })
        
        # NEW: Check for incorrect useRole() usage patterns
        if has_use_role:
            # Check for incorrect hasRole destructuring (hasRole doesn't exist)
            if re.search(r'const\s*{\s*hasRole\s*}\s*=\s*useRole\(\)', content):
                line_num = self._find_line_number(content, r'const\s*{\s*hasRole\s*}')
                self.errors.append({
                    "file": rel_path,
                    "line": line_num,
                    "message": "ADR-016: Incorrect useRole() usage. Hook returns 'isOrgAdmin' property, not 'hasRole()' function. See 01_std_front_ORG-ADMIN-PAGE-AUTH.md",
                    "rule": "org-admin-auth/use-role-correct-pattern"
                })
            
            # Check for hasRole() function calls (function doesn't exist)
            if re.search(r'hasRole\s*\(', content):
                line_num = self._find_line_number(content, r'hasRole\s*\(')
                self.errors.append({
                    "file": rel_path,
                    "line": line_num,
                    "message": "ADR-016: 'hasRole()' function does not exist. Use 'isOrgAdmin' property from useRole() hook.",
                    "rule": "org-admin-auth/no-hasRole-function"
                })
            
            # Suggest correct pattern if useRole is present but not using isOrgAdmin
            if 'isOrgAdmin' not in content and not re.search(r'hasRole\s*\(', content):
                self.warnings.append({
                    "file": rel_path,
                    "message": "ADR-016: useRole() hook imported but 'isOrgAdmin' property not used. Verify correct pattern is followed.",
                    "rule": "org-admin-auth/use-isOrgAdmin-property"
                })
        
        # Check for sys admin access (org admin pages should NOT allow sys admins)
        # Per revised ADR-016, org and sys admin pages have separate authorization
        has_sys_admin_check = 'isSysAdmin' in content
        has_org_admin_check = 'isOrgAdmin' in content
        
        # Look for patterns that incorrectly allow sys admins on org pages
        # These patterns allow access when EITHER isOrgAdmin OR isSysAdmin is true
        sys_admin_allowed_patterns = [
            r"!isOrgAdmin\s*&&\s*!isSysAdmin",  # if (!isOrgAdmin && !isSysAdmin) - denies only if BOTH false
            r"!isSysAdmin\s*&&\s*!isOrgAdmin",  # if (!isSysAdmin && !isOrgAdmin) - same thing reversed
            r"isOrgAdmin\s*\|\|\s*isSysAdmin",  # if (isOrgAdmin || isSysAdmin) - allows either
            r"isSysAdmin\s*\|\|\s*isOrgAdmin",  # if (isSysAdmin || isOrgAdmin) - same thing reversed
        ]
        
        for pattern in sys_admin_allowed_patterns:
            if re.search(pattern, content):
                line_num = self._find_line_number(content, pattern)
                self.errors.append({
                    "file": rel_path,
                    "line": line_num,
                    "message": "ADR-016: Org admin page allows sys admin access. Per revised ADR-016, org pages should only allow org admins. Sys admins should add themselves to the org with appropriate role.",
                    "rule": "org-admin-auth/org-admins-only"
                })
                break
    
    def _find_line_number(self, content: str, pattern: str) -> int:
        """Find the line number of the first match of a pattern."""
        match = re.search(pattern, content)
        if match:
            return content[:match.start()].count('\n') + 1
        return 1
