"""
Role Naming Standards Validator - Core Logic

Ensures code follows role naming standards:
- sys_role, org_role, ws_role (NOT global_role, role)
- sys_admin, sys_owner, sys_user (NOT platform_admin, platform_owner, platform_user)
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class Violation:
    """A single role naming violation."""
    file: str
    line: int
    column: int
    content: str
    pattern: str
    correct: str
    severity: str
    message: str


@dataclass
class ValidationResult:
    """Result from validating a project or file."""
    passed: bool
    violations: List[Violation] = field(default_factory=list)
    files_checked: int = 0
    files_with_violations: int = 0
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "passed": self.passed,
            "violations": [
                {
                    "file": v.file,
                    "line": v.line,
                    "column": v.column,
                    "content": v.content,
                    "pattern": v.pattern,
                    "correct": v.correct,
                    "severity": v.severity,
                    "message": v.message,
                }
                for v in self.violations
            ],
            "files_checked": self.files_checked,
            "files_with_violations": self.files_with_violations,
            "summary": {
                "total_violations": len(self.violations),
                "by_pattern": self._count_by_pattern(),
            }
        }
    
    def _count_by_pattern(self) -> Dict[str, int]:
        """Count violations by pattern."""
        counts = {}
        for v in self.violations:
            counts[v.pattern] = counts.get(v.pattern, 0) + 1
        return counts


class RoleNamingValidator:
    """
    Validates role naming standards across codebase.
    
    Anti-patterns detected:
    - global_role → should be sys_role
    - platform_owner → should be sys_owner
    - platform_admin → should be sys_admin
    - platform_user → should be sys_user
    - org_members.role (not org_role) → should be org_members.org_role
    - globalRole (TypeScript) → should be sysRole
    """
    
    # ==========================================================================
    # ANTI-PATTERNS TO DETECT
    # ==========================================================================
    # Validates all THREE role scopes: sys_role, org_role, ws_role
    # Prevents regressions in new module development
    # ==========================================================================
    
    ANTI_PATTERNS = {
        # ==================================================================
        # SYS_ROLE PATTERNS (System/Platform-level roles)
        # ==================================================================
        # Column: user_profiles.sys_role
        # Values: sys_owner, sys_admin, sys_user
        # ==================================================================
        'global_role': {
            'correct': 'sys_role',
            'severity': 'error',
            'message': 'Use sys_role instead of global_role',
        },
        'platform_owner': {
            'correct': 'sys_owner',
            'severity': 'error',
            'message': 'Use sys_owner instead of platform_owner',
        },
        'platform_admin': {
            'correct': 'sys_admin',
            'severity': 'error',
            'message': 'Use sys_admin instead of platform_admin',
        },
        'platform_user': {
            'correct': 'sys_user',
            'severity': 'error',
            'message': 'Use sys_user instead of platform_user',
        },
        'globalRole': {
            'correct': 'sysRole',
            'severity': 'error',
            'message': 'Use sysRole instead of globalRole (TypeScript)',
        },
        'isPlatformAdmin': {
            'correct': 'isSysAdmin',
            'severity': 'error',
            'message': 'Use isSysAdmin instead of isPlatformAdmin',
        },
        'is_platform_admin': {
            'correct': 'is_sys_admin',
            'severity': 'error',
            'message': 'Use is_sys_admin instead of is_platform_admin',
        },
        'PLATFORM_ADMIN_ROLES': {
            'correct': 'SYS_ADMIN_ROLES',
            'severity': 'error',
            'message': 'Use SYS_ADMIN_ROLES instead of PLATFORM_ADMIN_ROLES',
        },
        'system_role': {
            'correct': 'sys_role',
            'severity': 'error',
            'message': 'Use sys_role instead of system_role (use abbreviation)',
        },
        'systemRole': {
            'correct': 'sysRole',
            'severity': 'error',
            'message': 'Use sysRole instead of systemRole (TypeScript)',
        },
        
        # ==================================================================
        # ORG_ROLE PATTERNS (Organization-level roles)
        # ==================================================================
        # Column: org_members.org_role
        # Values: org_owner, org_admin, org_user
        # ==================================================================
        "org_members.role'": {
            'correct': "org_members.org_role'",
            'severity': 'error',
            'message': 'Use org_members.org_role instead of org_members.role (column renamed)',
        },
        'org_members.role"': {
            'correct': 'org_members.org_role"',
            'severity': 'error',
            'message': 'Use org_members.org_role instead of org_members.role (column renamed)',
        },
        'org_members.role)': {
            'correct': 'org_members.org_role)',
            'severity': 'error',
            'message': 'Use org_members.org_role instead of org_members.role (column renamed)',
        },
        'org_members.role ': {
            'correct': 'org_members.org_role ',
            'severity': 'error',
            'message': 'Use org_members.org_role instead of org_members.role (column renamed)',
        },
        'organization_role': {
            'correct': 'org_role',
            'severity': 'error',
            'message': 'Use org_role instead of organization_role (use abbreviation)',
        },
        'organizationRole': {
            'correct': 'orgRole',
            'severity': 'error',
            'message': 'Use orgRole instead of organizationRole (TypeScript)',
        },
        'organization_admin': {
            'correct': 'org_admin',
            'severity': 'error',
            'message': 'Use org_admin instead of organization_admin',
        },
        'organization_owner': {
            'correct': 'org_owner',
            'severity': 'error',
            'message': 'Use org_owner instead of organization_owner',
        },
        'organization_user': {
            'correct': 'org_user',
            'severity': 'error',
            'message': 'Use org_user instead of organization_user',
        },
        
        # ==================================================================
        # WS_ROLE PATTERNS (Workspace-level roles)
        # ==================================================================
        # Column: ws_members.ws_role
        # Values: ws_owner, ws_admin, ws_user
        # ==================================================================
        "ws_members.role'": {
            'correct': "ws_members.ws_role'",
            'severity': 'error',
            'message': 'Use ws_members.ws_role instead of ws_members.role',
        },
        'ws_members.role"': {
            'correct': 'ws_members.ws_role"',
            'severity': 'error',
            'message': 'Use ws_members.ws_role instead of ws_members.role',
        },
        'ws_members.role)': {
            'correct': 'ws_members.ws_role)',
            'severity': 'error',
            'message': 'Use ws_members.ws_role instead of ws_members.role',
        },
        'ws_members.role ': {
            'correct': 'ws_members.ws_role ',
            'severity': 'error',
            'message': 'Use ws_members.ws_role instead of ws_members.role',
        },
        'workspace_role': {
            'correct': 'ws_role',
            'severity': 'error',
            'message': 'Use ws_role instead of workspace_role (use abbreviation)',
        },
        'workspaceRole': {
            'correct': 'wsRole',
            'severity': 'error',
            'message': 'Use wsRole instead of workspaceRole (TypeScript)',
        },
        'workspace_admin': {
            'correct': 'ws_admin',
            'severity': 'error',
            'message': 'Use ws_admin instead of workspace_admin',
        },
        'workspace_owner': {
            'correct': 'ws_owner',
            'severity': 'error',
            'message': 'Use ws_owner instead of workspace_owner',
        },
        'workspace_user': {
            'correct': 'ws_user',
            'severity': 'error',
            'message': 'Use ws_user instead of workspace_user',
        },
    }
    
    # Tables that were renamed from platform_* to sys_*
    RENAMED_TABLES = {
        'platform_lambda_config': {
            'correct': 'sys_lambda_config',
            'severity': 'error',
            'message': 'Table renamed: use sys_lambda_config instead of platform_lambda_config',
        },
        'platform_module_registry': {
            'correct': 'sys_module_registry',
            'severity': 'error',
            'message': 'Table renamed: use sys_module_registry instead of platform_module_registry',
        },
        'platform_module_usage': {
            'correct': 'sys_module_usage',
            'severity': 'error',
            'message': 'Table renamed: use sys_module_usage instead of platform_module_usage',
        },
        'platform_module_usage_daily': {
            'correct': 'sys_module_usage_daily',
            'severity': 'error',
            'message': 'Table renamed: use sys_module_usage_daily instead of platform_module_usage_daily',
        },
        'platform_rag': {
            'correct': 'sys_rag',
            'severity': 'error',
            'message': 'Table renamed: use sys_rag instead of platform_rag',
        },
        'platform_idp_config': {
            'correct': 'sys_idp_config',
            'severity': 'error',
            'message': 'Table renamed: use sys_idp_config instead of platform_idp_config',
        },
        'platform_idp_audit_log': {
            'correct': 'sys_idp_audit_log',
            'severity': 'error',
            'message': 'Table renamed: use sys_idp_audit_log instead of platform_idp_audit_log',
        },
    }
    
    # File patterns to exclude from validation
    EXCLUSIONS = [
        '**/migrations/**',           # Migration scripts may reference old names
        '**/archive/**',              # Archived files
        '**/CHANGELOG*.md',           # Change logs document old names
        '**/node_modules/**',         # Dependencies
        '**/venv/**',                 # Python virtual environments
        '**/.git/**',                 # Git metadata
        '**/role-analysis*.txt',      # Analysis output files
        '**/plan_role-column-standardization.md',  # Old plan documents
        '**/plan_database-role-column-standardization.md',
        '**/role-standardization-impact-assessment.md',  # Impact assessment references old names
        '**/plan_sys-role-standardization.md',  # The plan itself references old names for documentation
        '**/README-role-standardization-migrations.md',  # Migration docs
        '**/role-naming-validator/**',  # This validator references old names
        '**/validation/**',            # All validation scripts (validators store anti-patterns)
        '**/scripts/validation/**',    # Validation scripts in test projects
    ]
    
    # File extensions to check
    INCLUDE_EXTENSIONS = ['.sql', '.py', '.ts', '.tsx', '.js', '.jsx']
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        # Combine all patterns
        self.all_patterns = {**self.ANTI_PATTERNS, **self.RENAMED_TABLES}
    
    def log(self, message: str):
        """Log message if verbose mode enabled."""
        if self.verbose:
            print(f"[DEBUG] {message}")
    
    def should_exclude(self, file_path: Path, base_path: Path) -> bool:
        """Check if file should be excluded from validation."""
        try:
            rel_path = file_path.relative_to(base_path)
        except ValueError:
            rel_path = file_path
            
        rel_str = str(rel_path)
        
        for pattern in self.EXCLUSIONS:
            # Convert glob pattern to regex for matching
            regex_pattern = pattern.replace('**/', '(.*/)?').replace('*', '[^/]*')
            if re.search(regex_pattern, rel_str):
                self.log(f"Excluding {rel_str} (matches {pattern})")
                return True
        return False
    
    def validate_file(self, file_path: Path, base_path: Optional[Path] = None) -> List[Violation]:
        """Validate a single file for role naming violations."""
        violations = []
        
        if base_path is None:
            base_path = file_path.parent
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                for pattern, info in self.all_patterns.items():
                    # Find all occurrences of the pattern in the line
                    for match in re.finditer(re.escape(pattern), line):
                        try:
                            rel_path = str(file_path.relative_to(base_path))
                        except ValueError:
                            rel_path = str(file_path)
                            
                        violations.append(Violation(
                            file=rel_path,
                            line=line_num,
                            column=match.start() + 1,
                            content=line.strip()[:100],  # Truncate long lines
                            pattern=pattern,
                            correct=info['correct'],
                            severity=info['severity'],
                            message=info['message'],
                        ))
        
        except Exception as e:
            self.log(f"Warning: Could not read {file_path}: {e}")
        
        return violations
    
    def validate_project(self, project_root: Path) -> ValidationResult:
        """Validate all files in a project."""
        violations = []
        files_checked = 0
        files_with_violations = set()
        
        project_root = Path(project_root).resolve()
        
        for ext in self.INCLUDE_EXTENSIONS:
            for file_path in project_root.rglob(f'*{ext}'):
                if self.should_exclude(file_path, project_root):
                    continue
                
                files_checked += 1
                file_violations = self.validate_file(file_path, project_root)
                
                if file_violations:
                    violations.extend(file_violations)
                    files_with_violations.add(str(file_path))
        
        return ValidationResult(
            passed=len(violations) == 0,
            violations=violations,
            files_checked=files_checked,
            files_with_violations=len(files_with_violations),
        )
    
    def format_report(self, result: ValidationResult) -> str:
        """Format validation result as a human-readable report."""
        lines = []
        
        lines.append("")
        lines.append("=" * 80)
        lines.append("ROLE NAMING STANDARDS VALIDATION REPORT")
        lines.append("=" * 80)
        
        if result.passed:
            lines.append(f"\n✅ PASSED: No violations found in {result.files_checked} files")
            lines.append("\nAll code follows role naming standards:")
            lines.append("  - sys_role, org_role, ws_role ✓")
            lines.append("  - sys_admin, sys_owner, sys_user ✓")
            return "\n".join(lines)
        
        lines.append(f"\n❌ FAILED: {len(result.violations)} violations found in {result.files_checked} files")
        lines.append(f"   Files with violations: {result.files_with_violations}\n")
        
        # Group by file
        by_file = {}
        for v in result.violations:
            if v.file not in by_file:
                by_file[v.file] = []
            by_file[v.file].append(v)
        
        for file, file_violations in sorted(by_file.items()):
            lines.append(f"\n📄 {file}")
            for v in file_violations:
                lines.append(f"  Line {v.line}: {v.message}")
                lines.append(f"    Found: {v.content[:60]}...")
                lines.append(f"    Replace '{v.pattern}' with '{v.correct}'")
        
        lines.append("\n" + "=" * 80)
        lines.append(f"Total: {len(result.violations)} violations")
        lines.append("=" * 80)
        
        return "\n".join(lines)


def validate_project(project_root: str, verbose: bool = False) -> ValidationResult:
    """Convenience function to validate a project."""
    validator = RoleNamingValidator(verbose=verbose)
    return validator.validate_project(Path(project_root))


def validate_file(file_path: str, verbose: bool = False) -> List[Violation]:
    """Convenience function to validate a single file."""
    validator = RoleNamingValidator(verbose=verbose)
    return validator.validate_file(Path(file_path))
