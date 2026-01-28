#!/usr/bin/env python3
"""
CORA Admin Route Validator

Validates API Gateway routes against the CORA Admin API Routes Standard.
See: docs/standards/standard_ADMIN-API-ROUTES.md

Usage:
    python validate_routes.py /path/to/project
    python validate_routes.py /path/to/project --verbose
    python validate_routes.py /path/to/project --output json
"""

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple

# Valid module shortnames per ADR-018b
VALID_MODULES = {
    'access',  # module-access - Identity & access control
    'ai',      # module-ai - AI provider management
    'mgmt',    # module-mgmt - Platform management
    'ws',      # module-ws - Workspace management
    'kb',      # module-kb - Knowledge base
    'chat',    # module-chat - Chat & messaging
    'voice',   # module-voice - Voice interviews
    'eval',    # module-eval - Evaluation & testing
}

# Route patterns
# Updated to support path parameters like {kbId}, {docId} at resource level
ADMIN_SYS_PATTERN = re.compile(r'^/admin/sys/([a-z]+)/([a-z][a-z0-9-]*|\{[a-zA-Z]+\})(/.*)?$')
ADMIN_ORG_PATTERN = re.compile(r'^/admin/org/([a-z]+)/([a-z][a-z0-9-]*|\{[a-zA-Z]+\})(/.*)?$')
ADMIN_WS_PATTERN = re.compile(r'^/admin/ws/\{wsId\}/([a-z]+)/([a-z][a-z0-9-]*|\{[a-zA-Z]+\})(/.*)?$')
DATA_API_PATTERN = re.compile(r'^/([a-z]+)(/.*)?$')

# Anti-patterns to detect
ANTI_PATTERNS = [
    (re.compile(r'^/admin/(?!sys/|org/|ws/)'), 'Missing scope (sys/org/ws) in admin route'),
    (re.compile(r'^/api/'), 'Do not use /api prefix for data routes'),
    (re.compile(r'^/admin/org/\{orgId\}'), 'Org ID should not be in path for org scope'),
    (re.compile(r'^/admin/ws/[a-z]+/'), 'Missing {wsId} in workspace admin route'),
    (re.compile(r'^/admin/organization/'), "Use 'org' not 'organization'"),
    (re.compile(r'/module-[a-z]+/'), 'Use module shortname not full module name'),
    (re.compile(r'/$'), 'Trailing slash not allowed'),
    (re.compile(r'[A-Z]'), 'Uppercase characters not allowed in route path'),
]


class Severity(Enum):
    ERROR = 'error'
    WARNING = 'warning'
    INFO = 'info'


@dataclass
class Violation:
    route: str
    message: str
    severity: Severity
    file: str
    line: int
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    total_routes: int = 0
    compliant_routes: int = 0
    violations: List[Violation] = field(default_factory=list)
    routes_by_category: Dict[str, int] = field(default_factory=dict)
    discovered_modules: Set[str] = field(default_factory=set)
    modules_with_sys_admin: Set[str] = field(default_factory=set)
    modules_with_org_admin: Set[str] = field(default_factory=set)
    
    @property
    def non_compliant_routes(self) -> int:
        return len([v for v in self.violations if v.severity == Severity.ERROR])
    
    @property
    def modules_missing_sys_admin(self) -> Set[str]:
        return self.discovered_modules - self.modules_with_sys_admin
    
    @property
    def modules_missing_org_admin(self) -> Set[str]:
        return self.discovered_modules - self.modules_with_org_admin


def extract_routes_from_terraform(file_path: Path) -> List[Tuple[str, int]]:
    """Extract route paths from Terraform files."""
    routes = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                # Match path = "..." patterns
                match = re.search(r'path\s*=\s*"([^"]+)"', line)
                if match:
                    routes.append((match.group(1), i))
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
    
    return routes


def extract_routes_from_lambda_docstring(file_path: Path) -> List[Tuple[str, int]]:
    """Extract route paths from Lambda function docstrings."""
    routes = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                # Match "- METHOD /path" patterns in docstrings
                match = re.search(r'^\s*-\s*(GET|POST|PUT|DELETE|PATCH)\s+(/[^\s]+)', line)
                if match:
                    routes.append((match.group(2), i))
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
    
    return routes


def categorize_route(route: str) -> str:
    """Categorize a route into its type."""
    if route.startswith('/admin/sys/'):
        return 'sys_admin'
    elif route.startswith('/admin/org/'):
        return 'org_admin'
    elif route.startswith('/admin/ws/'):
        return 'ws_admin'
    elif route.startswith('/admin/'):
        return 'admin_unknown'
    else:
        return 'data_api'


def validate_route(route: str, file: str, line: int) -> List[Violation]:
    """Validate a single route against the standard."""
    violations = []
    
    # Check anti-patterns first
    for pattern, message in ANTI_PATTERNS:
        if pattern.search(route):
            # Skip the uppercase check for path parameters like {wsId}
            if 'Uppercase' in message:
                # Remove path parameters before checking
                route_without_params = re.sub(r'\{[^}]+\}', '', route)
                if not re.search(r'[A-Z]', route_without_params):
                    continue
            
            violations.append(Violation(
                route=route,
                message=message,
                severity=Severity.ERROR,
                file=file,
                line=line,
            ))
    
    category = categorize_route(route)
    
    # Validate based on category
    if category == 'sys_admin':
        match = ADMIN_SYS_PATTERN.match(route)
        if match:
            module = match.group(1)
            if module not in VALID_MODULES:
                violations.append(Violation(
                    route=route,
                    message=f"Invalid module '{module}'. Valid modules: {', '.join(sorted(VALID_MODULES))}",
                    severity=Severity.ERROR,
                    file=file,
                    line=line,
                ))
        else:
            violations.append(Violation(
                route=route,
                message="System admin route doesn't match pattern /admin/sys/{module}/{resource}",
                severity=Severity.ERROR,
                file=file,
                line=line,
                suggestion="Expected: /admin/sys/{module}/{resource}",
            ))
    
    elif category == 'org_admin':
        match = ADMIN_ORG_PATTERN.match(route)
        if match:
            module = match.group(1)
            if module not in VALID_MODULES:
                violations.append(Violation(
                    route=route,
                    message=f"Invalid module '{module}'. Valid modules: {', '.join(sorted(VALID_MODULES))}",
                    severity=Severity.ERROR,
                    file=file,
                    line=line,
                ))
        else:
            violations.append(Violation(
                route=route,
                message="Org admin route doesn't match pattern /admin/org/{module}/{resource}",
                severity=Severity.ERROR,
                file=file,
                line=line,
                suggestion="Expected: /admin/org/{module}/{resource}",
            ))
    
    elif category == 'ws_admin':
        match = ADMIN_WS_PATTERN.match(route)
        if match:
            module = match.group(1)
            if module not in VALID_MODULES:
                violations.append(Violation(
                    route=route,
                    message=f"Invalid module '{module}'. Valid modules: {', '.join(sorted(VALID_MODULES))}",
                    severity=Severity.ERROR,
                    file=file,
                    line=line,
                ))
        else:
            violations.append(Violation(
                route=route,
                message="Workspace admin route doesn't match pattern /admin/ws/{wsId}/{module}/{resource}",
                severity=Severity.ERROR,
                file=file,
                line=line,
                suggestion="Expected: /admin/ws/{wsId}/{module}/{resource}",
            ))
    
    elif category == 'admin_unknown':
        violations.append(Violation(
            route=route,
            message="Admin route missing scope (sys/org/ws)",
            severity=Severity.ERROR,
            file=file,
            line=line,
            suggestion="Use /admin/sys/, /admin/org/, or /admin/ws/{wsId}/",
        ))
    
    elif category == 'data_api':
        match = DATA_API_PATTERN.match(route)
        if match:
            module = match.group(1)
            if module not in VALID_MODULES:
                # Data routes can have any valid path, just warn if it looks like a module
                if len(module) <= 10:  # Short names might be modules
                    violations.append(Violation(
                        route=route,
                        message=f"Data route module '{module}' not in standard module list (may be intentional)",
                        severity=Severity.WARNING,
                        file=file,
                        line=line,
                    ))
    
    return violations


def discover_modules(project_path: Path) -> Set[str]:
    """Discover installed modules by scanning the packages/ directory."""
    modules = set()
    
    # Check for packages/ directory (deployed project)
    packages_dir = project_path / 'packages'
    if packages_dir.exists() and packages_dir.is_dir():
        for item in packages_dir.iterdir():
            if item.is_dir() and item.name.startswith('module-'):
                # Extract shortname: module-access -> access
                shortname = item.name.replace('module-', '')
                if shortname in VALID_MODULES:
                    modules.add(shortname)
    
    # Check if path itself is a module directory (e.g., templates/_modules-core)
    elif project_path.name in ['_modules-core', '_modules-functional']:
        for item in project_path.iterdir():
            if item.is_dir() and item.name.startswith('module-'):
                shortname = item.name.replace('module-', '')
                if shortname in VALID_MODULES:
                    modules.add(shortname)
    
    # Check for templates/ directory (toolkit)
    else:
        for template_dir in ['_modules-core', '_modules-functional']:
            template_path = project_path / template_dir
            if template_path.exists() and template_path.is_dir():
                for item in template_path.iterdir():
                    if item.is_dir() and item.name.startswith('module-'):
                        shortname = item.name.replace('module-', '')
                        if shortname in VALID_MODULES:
                            modules.add(shortname)
    
    return modules


def find_route_files(project_path: Path) -> List[Tuple[Path, str]]:
    """Find all files that may contain route definitions."""
    files = []
    
    # Terraform files (API Gateway definitions)
    for tf_file in project_path.glob('**/*.tf'):
        if 'outputs' in tf_file.name or 'routes' in tf_file.name or 'api' in tf_file.name.lower():
            files.append((tf_file, 'terraform'))
    
    # Lambda function files (docstring routes)
    for py_file in project_path.glob('**/lambda_function.py'):
        files.append((py_file, 'lambda'))
    
    return files


def validate_project(project_path: Path, verbose: bool = False) -> ValidationResult:
    """Validate all routes in a project."""
    result = ValidationResult()
    seen_routes: Set[str] = set()
    
    # Discover installed modules
    result.discovered_modules = discover_modules(project_path)
    
    if verbose:
        print(f"Discovered modules: {sorted(result.discovered_modules)}")
    
    files = find_route_files(project_path)
    
    if verbose:
        print(f"Found {len(files)} files to scan...")
    
    for file_path, file_type in files:
        if verbose:
            print(f"  Scanning: {file_path}")
        
        if file_type == 'terraform':
            routes = extract_routes_from_terraform(file_path)
        else:
            routes = extract_routes_from_lambda_docstring(file_path)
        
        for route, line in routes:
            if route in seen_routes:
                continue
            seen_routes.add(route)
            
            result.total_routes += 1
            
            # Categorize
            category = categorize_route(route)
            result.routes_by_category[category] = result.routes_by_category.get(category, 0) + 1
            
            # Track module admin route presence
            if category == 'sys_admin':
                match = ADMIN_SYS_PATTERN.match(route)
                if match:
                    module = match.group(1)
                    if module in result.discovered_modules:
                        result.modules_with_sys_admin.add(module)
            elif category == 'org_admin':
                match = ADMIN_ORG_PATTERN.match(route)
                if match:
                    module = match.group(1)
                    if module in result.discovered_modules:
                        result.modules_with_org_admin.add(module)
            
            # Validate
            violations = validate_route(route, str(file_path), line)
            
            if not violations:
                result.compliant_routes += 1
            else:
                result.violations.extend(violations)
    
    # Check for missing admin routes (admin page parity)
    for module in result.modules_missing_sys_admin:
        result.violations.append(Violation(
            route=f'/admin/sys/{module}/*',
            message=f"Module '{module}' is missing system admin routes",
            severity=Severity.ERROR,
            file='<module discovery>',
            line=0,
            suggestion=f"Add system admin routes for module-{module} (e.g., /admin/sys/{module}/config)",
        ))
    
    for module in result.modules_missing_org_admin:
        result.violations.append(Violation(
            route=f'/admin/org/{module}/*',
            message=f"Module '{module}' is missing organization admin routes",
            severity=Severity.ERROR,
            file='<module discovery>',
            line=0,
            suggestion=f"Add org admin routes for module-{module} (e.g., /admin/org/{module}/config)",
        ))
    
    return result


def format_text_output(result: ValidationResult) -> str:
    """Format validation result as human-readable text."""
    lines = []
    lines.append("=" * 70)
    lines.append("CORA Admin Route Validation Report")
    lines.append("=" * 70)
    lines.append("")
    
    # Summary
    lines.append(f"Total routes scanned: {result.total_routes}")
    lines.append(f"Compliant routes: {result.compliant_routes}")
    lines.append(f"Non-compliant routes: {result.non_compliant_routes}")
    lines.append("")
    
    # Module parity check
    if result.discovered_modules:
        lines.append("Admin Page Parity Check:")
        lines.append(f"  Discovered modules: {len(result.discovered_modules)}")
        lines.append(f"  Modules with sys admin routes: {len(result.modules_with_sys_admin)}")
        lines.append(f"  Modules with org admin routes: {len(result.modules_with_org_admin)}")
        lines.append("")
        
        if result.modules_missing_sys_admin or result.modules_missing_org_admin:
            lines.append("  ❌ Missing admin routes:")
            for module in sorted(result.modules_missing_sys_admin):
                lines.append(f"    - {module}: missing sys admin routes")
            for module in sorted(result.modules_missing_org_admin):
                lines.append(f"    - {module}: missing org admin routes")
            lines.append("")
        else:
            lines.append("  ✅ All modules have both sys and org admin routes")
            lines.append("")
    
    # By category
    lines.append("Routes by category:")
    for category, count in sorted(result.routes_by_category.items()):
        lines.append(f"  {category}: {count}")
    lines.append("")
    
    # Violations
    if result.violations:
        errors = [v for v in result.violations if v.severity == Severity.ERROR]
        warnings = [v for v in result.violations if v.severity == Severity.WARNING]
        
        if errors:
            lines.append(f"❌ ERRORS ({len(errors)}):")
            lines.append("-" * 70)
            for v in errors:
                lines.append(f"  {v.route}")
                lines.append(f"    File: {v.file}:{v.line}")
                lines.append(f"    Issue: {v.message}")
                if v.suggestion:
                    lines.append(f"    → {v.suggestion}")
                lines.append("")
        
        if warnings:
            lines.append(f"⚠️  WARNINGS ({len(warnings)}):")
            lines.append("-" * 70)
            for v in warnings:
                lines.append(f"  {v.route}")
                lines.append(f"    File: {v.file}:{v.line}")
                lines.append(f"    Issue: {v.message}")
                lines.append("")
    
    # Final status
    lines.append("=" * 70)
    if result.non_compliant_routes == 0:
        lines.append("✅ Status: PASSED - All routes compliant")
    else:
        lines.append(f"❌ Status: FAILED - {result.non_compliant_routes} route(s) non-compliant")
    lines.append("=" * 70)
    
    return "\n".join(lines)


def format_json_output(result: ValidationResult) -> str:
    """Format validation result as JSON."""
    data = {
        'summary': {
            'total_routes': result.total_routes,
            'compliant_routes': result.compliant_routes,
            'non_compliant_routes': result.non_compliant_routes,
            'passed': result.non_compliant_routes == 0,
        },
        'module_parity': {
            'discovered_modules': sorted(result.discovered_modules),
            'modules_with_sys_admin': sorted(result.modules_with_sys_admin),
            'modules_with_org_admin': sorted(result.modules_with_org_admin),
            'modules_missing_sys_admin': sorted(result.modules_missing_sys_admin),
            'modules_missing_org_admin': sorted(result.modules_missing_org_admin),
        },
        'routes_by_category': result.routes_by_category,
        'violations': [
            {
                'route': v.route,
                'message': v.message,
                'severity': v.severity.value,
                'file': v.file,
                'line': v.line,
                'suggestion': v.suggestion,
            }
            for v in result.violations
        ],
    }
    return json.dumps(data, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description='Validate CORA API Gateway routes against the standard'
    )
    parser.add_argument('path', help='Path to project to validate')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--output', '-o', choices=['text', 'json'], default='text', help='Output format')
    
    args = parser.parse_args()
    
    project_path = Path(args.path)
    if not project_path.exists():
        print(f"Error: Path does not exist: {args.path}", file=sys.stderr)
        sys.exit(1)
    
    result = validate_project(project_path, verbose=args.verbose)
    
    if args.output == 'json':
        print(format_json_output(result))
    else:
        print(format_text_output(result))
    
    # Exit with error code if violations found
    sys.exit(1 if result.non_compliant_routes > 0 else 0)


if __name__ == '__main__':
    main()