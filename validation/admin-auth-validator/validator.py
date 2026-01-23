"""Admin Auth Validator - Checks admin pages follow ADR-015 Pattern A."""

import re
from pathlib import Path
from typing import List, Dict, Any


class AdminAuthValidator:
    """Validates admin pages follow Pattern A authentication."""

    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        
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
        
        return pages
    
    def _validate_page(self, page_path: Path):
        """Validate a single admin page."""
        try:
            content = page_path.read_text()
            rel_path = str(page_path.relative_to(self.project_path))
            
            # Skip shell pages - they use server/client split pattern
            shell_pages = [
                "apps/web/app/admin/sys/page.tsx",
                "apps/web/app/admin/org/page.tsx"
            ]
            if rel_path in shell_pages:
                return  # Shell pages are exempt from Pattern A
            
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
