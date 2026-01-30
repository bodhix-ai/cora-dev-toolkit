#!/usr/bin/env python3
"""
CORA Auth Pattern Validator

Validates that Lambda functions follow standardized authentication patterns.

Usage:
    python validate_auth_patterns.py <project_root>
    python validate_auth_patterns.py <project_root> --module module-chat

Standards Reference: ADR-019 (docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md)
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple
from dataclasses import dataclass


@dataclass
class AuthViolation:
    """Represents an auth pattern violation"""
    file: str
    line: int
    violation_type: str
    message: str
    severity: str  # 'error' or 'warning'


class AuthPatternValidator:
    """Validates Lambda functions follow CORA auth standards"""
    
    # Standard constants that should be imported
    REQUIRED_CONSTANTS = {
        'SYS_ADMIN_ROLES',
        'ORG_ADMIN_ROLES', 
        'WS_ADMIN_ROLES'
    }
    
    # Helper functions that should be used
    REQUIRED_HELPERS = {
        'is_sys_admin',
        'is_org_admin',
        'is_ws_admin'
    }
    
    # Inline patterns to detect (violations)
    INLINE_ROLE_PATTERNS = [
        r"[\'\"]sys_owner[\'\"],\s*[\'\"]sys_admin[\'\"]",
        r"[\'\"]sys_admin[\'\"],\s*[\'\"]sys_owner[\'\"]",
        r"[\'\"]org_owner[\'\"],\s*[\'\"]org_admin[\'\"]",
        r"[\'\"]org_admin[\'\"],\s*[\'\"]org_owner[\'\"]",
        r"[\'\"]ws_owner[\'\"],\s*[\'\"]ws_admin[\'\"]",
        r"[\'\"]ws_admin[\'\"],\s*[\'\"]ws_owner[\'\"]",
    ]
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.violations: List[AuthViolation] = []
        
    def validate_project(self, module_filter: str = None) -> List[AuthViolation]:
        """
        Validate all Lambda functions in project
        
        Args:
            module_filter: Optional module name to filter (e.g., 'module-chat')
        
        Returns:
            List of violations found
        """
        print(f"🔍 Validating auth patterns in: {self.project_root}")
        
        # Find all lambda_function.py files
        lambda_files = self._find_lambda_files(module_filter)
        
        print(f"📂 Found {len(lambda_files)} lambda functions to validate")
        
        for lambda_file in lambda_files:
            self._validate_file(lambda_file)
        
        return self.violations
    
    def _find_lambda_files(self, module_filter: str = None) -> List[Path]:
        """Find all lambda_function.py files in project"""
        lambda_files = []
        
        # Search in stack repo packages
        packages_dir = self.project_root / "packages"
        if packages_dir.exists():
            for module_dir in packages_dir.iterdir():
                if module_filter and module_dir.name != module_filter:
                    continue
                    
                backend_dir = module_dir / "backend" / "lambdas"
                if backend_dir.exists():
                    for lambda_dir in backend_dir.iterdir():
                        lambda_file = lambda_dir / "lambda_function.py"
                        if lambda_file.exists():
                            lambda_files.append(lambda_file)
        
        return lambda_files
    
    def _validate_file(self, file_path: Path):
        """Validate a single Lambda file"""
        print(f"  📄 Checking: {file_path.relative_to(self.project_root)}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
        
        # Check 1: Inline role lists (most critical)
        self._check_inline_roles(file_path, lines)
        
        # Check 2: Standard constant usage
        self._check_constant_imports(file_path, content)
        
        # Check 3: Helper function usage
        self._check_helper_usage(file_path, content)
        
        # Check 4: Duplicate auth checks
        self._check_duplicate_auth(file_path, lines)
        
        # Check 5: Scope validation (org_id, ws_id)
        self._check_scope_validation(file_path, lines)
    
    def _check_inline_roles(self, file_path: Path, lines: List[str]):
        """Check for inline role lists (violation)"""
        for i, line in enumerate(lines, 1):
            for pattern in self.INLINE_ROLE_PATTERNS:
                if re.search(pattern, line):
                    self.violations.append(AuthViolation(
                        file=str(file_path.relative_to(self.project_root)),
                        line=i,
                        violation_type='inline_role_list',
                        message=f"Inline role list detected. Use standard constants (SYS_ADMIN_ROLES, ORG_ADMIN_ROLES, WS_ADMIN_ROLES)",
                        severity='error'
                    ))
    
    def _check_constant_imports(self, file_path: Path, content: str):
        """Check that standard constants are imported"""
        # This is a basic check - can be enhanced in S1-S3
        if 'sys_role' in content or 'org_role' in content or 'ws_role' in content:
            has_constant_import = any(
                const in content for const in self.REQUIRED_CONSTANTS
            )
            if not has_constant_import:
                self.violations.append(AuthViolation(
                    file=str(file_path.relative_to(self.project_root)),
                    line=1,
                    violation_type='missing_constant_import',
                    message="Role checks detected but standard constants not imported",
                    severity='warning'
                ))
    
    def _check_helper_usage(self, file_path: Path, content: str):
        """Check that helper functions are used"""
        # Basic check - can be enhanced in S1-S3
        if 'find_one(\'user_profiles\'' in content:
            has_helper = any(
                helper in content for helper in self.REQUIRED_HELPERS
            )
            if not has_helper:
                self.violations.append(AuthViolation(
                    file=str(file_path.relative_to(self.project_root)),
                    line=1,
                    violation_type='missing_helper',
                    message="Direct profile queries detected. Use helper functions (is_sys_admin, is_org_admin, is_ws_admin)",
                    severity='warning'
                ))
    
    def _check_duplicate_auth(self, file_path: Path, lines: List[str]):
        """Check for duplicate auth checks within same file"""
        # Count auth check patterns
        auth_patterns = {
            'sys_admin': 0,
            'org_admin': 0,
            'ws_admin': 0
        }
        
        for line in lines:
            if 'sys_role' in line and ('in' in line or '==' in line):
                auth_patterns['sys_admin'] += 1
            if 'org_role' in line and ('in' in line or '==' in line):
                auth_patterns['org_admin'] += 1
            if 'ws_role' in line and ('in' in line or '==' in line):
                auth_patterns['ws_admin'] += 1
        
        for auth_type, count in auth_patterns.items():
            if count > 3:  # More than 3 checks suggests duplication
                self.violations.append(AuthViolation(
                    file=str(file_path.relative_to(self.project_root)),
                    line=1,
                    violation_type='duplicate_auth_checks',
                    message=f"Detected {count} {auth_type} checks. Consider centralizing at router level.",
                    severity='warning'
                ))
    
    def _check_scope_validation(self, file_path: Path, lines: List[str]):
        """Check that org_id/ws_id are validated for scoped routes"""
        # This is a placeholder - will be enhanced in S1-S3
        pass
    
    def print_report(self):
        """Print validation report"""
        print("\n" + "="*80)
        print("🔒 AUTH PATTERN VALIDATION REPORT")
        print("="*80)
        
        if not self.violations:
            print("\n✅ All Lambda functions follow CORA auth standards!")
            return
        
        # Group by severity
        errors = [v for v in self.violations if v.severity == 'error']
        warnings = [v for v in self.violations if v.severity == 'warning']
        
        if errors:
            print(f"\n❌ ERRORS ({len(errors)}):")
            for v in errors:
                print(f"  {v.file}:{v.line}")
                print(f"    {v.violation_type}: {v.message}\n")
        
        if warnings:
            print(f"\n⚠️  WARNINGS ({len(warnings)}):")
            for v in warnings:
                print(f"  {v.file}:{v.line}")
                print(f"    {v.violation_type}: {v.message}\n")
        
        print("="*80)
        print(f"Total: {len(errors)} errors, {len(warnings)} warnings")
        print("="*80)


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python validate_auth_patterns.py <project_root> [--module <module-name>]")
        sys.exit(1)
    
    project_root = sys.argv[1]
    module_filter = None
    
    if '--module' in sys.argv:
        module_index = sys.argv.index('--module')
        if module_index + 1 < len(sys.argv):
            module_filter = sys.argv[module_index + 1]
    
    validator = AuthPatternValidator(project_root)
    violations = validator.validate_project(module_filter)
    validator.print_report()
    
    # Exit with error code if violations found
    errors = [v for v in violations if v.severity == 'error']
    sys.exit(len(errors))


if __name__ == '__main__':
    main()