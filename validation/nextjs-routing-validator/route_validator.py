#!/usr/bin/env python3
"""
CORA Next.js Routing Validator

Validates Next.js App Router routes against CORA routing standards.
Checks for:
- Parent route existence (nested routes require parent page.tsx)
- Route group consistency
- Placeholder usage in imports
- Route file structure and exports
- Template-to-project route mapping

Reference: docs/standards/standard_NEXTJS-ROUTING.md
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Set
from dataclasses import dataclass
from collections import defaultdict


@dataclass
class ValidationError:
    """Represents a routing validation error."""
    severity: str  # 'error', 'warning', 'info'
    category: str
    file_path: str
    message: str
    suggestion: str = ""


class NextJsRoutingValidator:
    """Validates Next.js routing compliance with CORA standards."""
    
    def __init__(self, project_root: Path, verbose: bool = True):
        self.project_root = project_root
        self.app_dir = project_root / "apps" / "web" / "app"
        self.errors: List[ValidationError] = []
        self.verbose = verbose
        
        # Detect project name from package.json or path
        self.project_name = self._detect_project_name()
        
    def _detect_project_name(self) -> str:
        """Detect project name from package.json or directory name."""
        package_json = self.project_root / "package.json"
        if package_json.exists():
            import json
            with open(package_json) as f:
                data = json.load(f)
                name = data.get("name", "")
                if name.startswith("@"):
                    return name.split("/")[0][1:]  # @ai-sec/... -> ai-sec
        
        # Fallback: use directory name
        dir_name = self.project_root.name
        if dir_name.endswith("-stack"):
            return dir_name[:-6]  # remove -stack suffix
        return dir_name
    
    def validate(self) -> List[ValidationError]:
        """Run all validation checks."""
        if not self.app_dir.exists():
            self.errors.append(ValidationError(
                severity="error",
                category="structure",
                file_path=str(self.app_dir),
                message="App directory not found",
                suggestion="Ensure you're running from a Next.js project with apps/web/app/ structure"
            ))
            return self.errors
        
        if self.verbose:
            print(f"🔍 Validating Next.js routes in {self.project_root}")
            print(f"📦 Detected project name: {self.project_name}")
            print()
        
        # Run validation checks
        self._check_parent_routes_exist()
        self._check_route_group_consistency()
        self._check_placeholder_usage()
        self._check_route_file_structure()
        self._check_duplicate_routes()
        self._check_nested_dynamic_routes()  # NEW: Detect flat routing violations
        
        return self.errors
    
    def _find_all_route_files(self) -> List[Path]:
        """Find all page.tsx and layout.tsx files in app directory."""
        route_files = []
        for pattern in ["**/page.tsx", "**/layout.tsx", "**/route.ts"]:
            route_files.extend(self.app_dir.glob(pattern))
        return sorted(route_files)
    
    def _get_route_hierarchy(self, route_file: Path) -> List[str]:
        """
        Get the route hierarchy as a list of segments.
        Example: app/ws/[id]/eval/[evalId]/page.tsx -> ['ws', '[id]', 'eval', '[evalId]']
        """
        relative = route_file.relative_to(self.app_dir)
        segments = list(relative.parent.parts)
        return segments
    
    def _check_parent_routes_exist(self):
        """Check that all nested routes have parent page.tsx files."""
        if self.verbose:
            print("📋 Checking parent route existence...")
        
        route_files = [f for f in self._find_all_route_files() if f.name == "page.tsx"]
        
        # Build set of existing route paths
        existing_routes = set()
        for route_file in route_files:
            hierarchy = self._get_route_hierarchy(route_file)
            existing_routes.add(tuple(hierarchy))
        
        # Check each route for parent existence
        for route_file in route_files:
            hierarchy = self._get_route_hierarchy(route_file)
            
            # Check each ancestor level
            for i in range(1, len(hierarchy)):
                parent_hierarchy = tuple(hierarchy[:i])
                
                if parent_hierarchy not in existing_routes:
                    parent_path = self.app_dir / Path(*parent_hierarchy) / "page.tsx"
                    
                    self.errors.append(ValidationError(
                        severity="error",
                        category="missing_parent",
                        file_path=str(route_file.relative_to(self.project_root)),
                        message=f"Missing parent route: {'/'.join(parent_hierarchy)}",
                        suggestion=f"Create {parent_path.relative_to(self.project_root)}"
                    ))
    
    def _check_route_group_consistency(self):
        """Check that routes within same hierarchy use consistent route groups."""
        if self.verbose:
            print("📋 Checking route group consistency...")
        
        route_files = [f for f in self._find_all_route_files() if f.name == "page.tsx"]
        
        # Group routes by their base path (excluding route groups)
        route_groups_by_base: Dict[str, Set[str]] = defaultdict(set)
        
        for route_file in route_files:
            hierarchy = self._get_route_hierarchy(route_file)
            
            # Separate route groups from regular segments
            route_groups = [s for s in hierarchy if s.startswith("(") and s.endswith(")")]
            base_segments = [s for s in hierarchy if not (s.startswith("(") and s.endswith(")"))]
            
            if route_groups:
                base_key = "/".join(base_segments)
                for group in route_groups:
                    route_groups_by_base[base_key].add(group)
        
        # Check for inconsistent route group usage
        for base_path, groups in route_groups_by_base.items():
            if len(groups) > 1:
                self.errors.append(ValidationError(
                    severity="warning",
                    category="route_group_inconsistency",
                    file_path=base_path,
                    message=f"Multiple route groups used for '{base_path}': {', '.join(sorted(groups))}",
                    suggestion="Use consistent route groups for related routes. See standard_NEXTJS-ROUTING.md"
                ))
    
    def _check_placeholder_usage(self):
        """Check that route files use @{{PROJECT_NAME}} placeholders, not hardcoded names."""
        if self.verbose:
            print("📋 Checking placeholder usage in imports...")
        
        route_files = self._find_all_route_files()
        
        # Pattern to match imports with hardcoded project names
        hardcoded_pattern = re.compile(r'from\s+["\']@(\w+)/(module-\w+)["\']')
        placeholder_pattern = re.compile(r'{{PROJECT_NAME}}')
        
        for route_file in route_files:
            try:
                content = route_file.read_text()
                
                # Check for template placeholders (shouldn't exist in deployed project)
                if placeholder_pattern.search(content):
                    self.errors.append(ValidationError(
                        severity="error",
                        category="unreplaced_placeholder",
                        file_path=str(route_file.relative_to(self.project_root)),
                        message="Template placeholder {{PROJECT_NAME}} not replaced",
                        suggestion=f"Replace {{{{PROJECT_NAME}}}} with {self.project_name}"
                    ))
                
                # Check for hardcoded project names that don't match current project
                for match in hardcoded_pattern.finditer(content):
                    project_in_import = match.group(1)
                    module_name = match.group(2)
                    
                    if project_in_import != self.project_name:
                        self.errors.append(ValidationError(
                            severity="error",
                            category="wrong_project_name",
                            file_path=str(route_file.relative_to(self.project_root)),
                            message=f"Import uses wrong project name: @{project_in_import}/{module_name}",
                            suggestion=f"Change to @{self.project_name}/{module_name}"
                        ))
                        
            except Exception as e:
                self.errors.append(ValidationError(
                    severity="warning",
                    category="read_error",
                    file_path=str(route_file.relative_to(self.project_root)),
                    message=f"Could not read file: {e}"
                ))
    
    def _check_route_file_structure(self):
        """Check that route files follow required structure."""
        if self.verbose:
            print("📋 Checking route file structure...")
        
        route_files = [f for f in self._find_all_route_files() if f.name == "page.tsx"]
        
        for route_file in route_files:
            try:
                content = route_file.read_text()
                
                # Check for default export
                if not re.search(r'export\s+default\s+', content):
                    self.errors.append(ValidationError(
                        severity="error",
                        category="missing_export",
                        file_path=str(route_file.relative_to(self.project_root)),
                        message="Missing 'export default' statement",
                        suggestion="Route files must export a default component"
                    ))
                
                # Check for "use client" when using client hooks
                client_hooks = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useParams', 'useRouter', 'useSearchParams']
                uses_client_hooks = any(hook in content for hook in client_hooks)
                has_use_client = '"use client"' in content or "'use client'" in content
                
                if uses_client_hooks and not has_use_client:
                    self.errors.append(ValidationError(
                        severity="warning",
                        category="missing_use_client",
                        file_path=str(route_file.relative_to(self.project_root)),
                        message="Uses client hooks but missing 'use client' directive",
                        suggestion="Add 'use client' at the top of the file"
                    ))
                        
            except Exception as e:
                self.errors.append(ValidationError(
                    severity="warning",
                    category="read_error",
                    file_path=str(route_file.relative_to(self.project_root)),
                    message=f"Could not read file: {e}"
                ))
    
    def _check_duplicate_routes(self):
        """Check for duplicate routes that might cause conflicts."""
        if self.verbose:
            print("📋 Checking for duplicate routes...")
        
        route_files = [f for f in self._find_all_route_files() if f.name == "page.tsx"]
        
        # Build map of URL paths to file paths
        url_to_files: Dict[str, List[Path]] = defaultdict(list)
        
        for route_file in route_files:
            hierarchy = self._get_route_hierarchy(route_file)
            
            # Build URL path (excluding route groups)
            url_segments = [s for s in hierarchy if not (s.startswith("(") and s.endswith(")"))]
            url_path = "/" + "/".join(url_segments) if url_segments else "/"
            
            url_to_files[url_path].append(route_file)
        
        # Report duplicates
        for url_path, files in url_to_files.items():
            if len(files) > 1:
                file_list = "\n  ".join(str(f.relative_to(self.project_root)) for f in files)
                self.errors.append(ValidationError(
                    severity="error",
                    category="duplicate_route",
                    file_path=url_path,
                    message=f"Multiple files handle the same URL path '{url_path}':\n  {file_list}",
                    suggestion="Remove duplicate routes or use different route groups"
                ))
    
    def _check_nested_dynamic_routes(self):
        """Check for nested dynamic routes (anti-pattern in CORA)."""
        if self.verbose:
            print("📋 Checking for nested dynamic routes (CORA flat routing pattern)...")
        
        route_files = [f for f in self._find_all_route_files() if f.name == "page.tsx"]
        
        for route_file in route_files:
            hierarchy = self._get_route_hierarchy(route_file)
            
            # Count dynamic segments (those with brackets)
            dynamic_segments = [s for s in hierarchy if '[' in s and ']' in s]
            
            # CORA standard: Avoid nested dynamic routes
            if len(dynamic_segments) > 1:
                path_str = "/".join(hierarchy)
                self.errors.append(ValidationError(
                    severity="error",
                    category="nested_dynamic_route",
                    file_path=str(route_file.relative_to(self.project_root)),
                    message=f"Nested dynamic route detected: /{path_str}",
                    suggestion=(
                        f"CORA uses flat routes. Instead of nested /{path_str}, "
                        f"create a root-level route like /{dynamic_segments[-1]}/ and pass "
                        f"context via query params. See docs/standards/standard_NEXTJS-ROUTING.md"
                    )
                ))
                
                # Special check for the specific workspace/eval anti-pattern
                if "eval" in path_str.lower() and any(seg in path_str.lower() for seg in ["ws", "workspace"]):
                    self.errors.append(ValidationError(
                        severity="error",
                        category="workspace_eval_antipattern",
                        file_path=str(route_file.relative_to(self.project_root)),
                        message=(
                            "Found workspace-scoped eval route pattern. "
                            "This will cause 404 errors!"
                        ),
                        suggestion=(
                            "Use root-level /eval/[id] route instead of /ws/[id]/eval/[evalId]. "
                            "Pass workspace context via query params: /eval/123?workspace=456"
                        )
                    ))
    
    def print_summary(self):
        """Print validation summary."""
        print()
        print("=" * 80)
        print("VALIDATION SUMMARY")
        print("=" * 80)
        
        if not self.errors:
            print("✅ All routing validation checks passed!")
            return
        
        # Group errors by severity
        errors_by_severity = defaultdict(list)
        for error in self.errors:
            errors_by_severity[error.severity].append(error)
        
        # Print summary counts
        error_count = len(errors_by_severity.get("error", []))
        warning_count = len(errors_by_severity.get("warning", []))
        info_count = len(errors_by_severity.get("info", []))
        
        print(f"❌ Errors: {error_count}")
        print(f"⚠️  Warnings: {warning_count}")
        print(f"ℹ️  Info: {info_count}")
        print()
        
        # Print details by severity
        for severity in ["error", "warning", "info"]:
            errors = errors_by_severity.get(severity, [])
            if not errors:
                continue
            
            icon = {"error": "❌", "warning": "⚠️", "info": "ℹ️"}[severity]
            print(f"\n{icon} {severity.upper()}S:")
            print("-" * 80)
            
            for error in errors:
                print(f"\n[{error.category}] {error.file_path}")
                print(f"  {error.message}")
                if error.suggestion:
                    print(f"  💡 {error.suggestion}")
        
        print()
        print("=" * 80)
        print(f"📚 Reference: docs/standards/standard_NEXTJS-ROUTING.md")
        print("=" * 80)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python route_validator.py <project-stack-path>")
        print()
        print("Example:")
        print("  python route_validator.py ~/code/sts/security/ai-sec-stack")
        sys.exit(1)
    
    project_path = Path(sys.argv[1]).expanduser().resolve()
    
    if not project_path.exists():
        print(f"❌ Error: Path does not exist: {project_path}")
        sys.exit(1)
    
    if not (project_path / "apps" / "web").exists():
        print(f"❌ Error: Not a valid CORA stack project (missing apps/web/)")
        sys.exit(1)
    
    # Run validation
    validator = NextJsRoutingValidator(project_path)
    errors = validator.validate()
    validator.print_summary()
    
    # Exit with error code if validation failed
    error_count = len([e for e in errors if e.severity == "error"])
    sys.exit(1 if error_count > 0 else 0)


if __name__ == "__main__":
    main()
