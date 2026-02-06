"""
TypeScript Type Check Validator

Runs TypeScript compiler in type-check mode across all packages.
Identifies type errors with file, line, and column information.

Part of CORA validation suite to prevent type errors before deployment.

Standard: 05_std_quality_VALIDATOR-OUTPUT
"""

import subprocess
import re
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Import shared output format utilities
try:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from shared.output_format import (
        create_error, 
        create_warning,
        extract_module_from_path,
        SEVERITY_HIGH,
        SEVERITY_MEDIUM,
        SEVERITY_LOW,
        SEVERITY_CRITICAL
    )
except ImportError:
    # Fallback if shared module not available
    def create_error(file, message, category, severity="high", line=None, suggestion=None, project_root=None):
        return {"file": file, "message": message, "category": category, "severity": severity, "line": line, "suggestion": suggestion}
    def create_warning(file, message, category, line=None, suggestion=None, project_root=None):
        return {"file": file, "message": message, "category": category, "severity": "medium", "line": line, "suggestion": suggestion}
    def extract_module_from_path(file_path):
        return "unknown"
    SEVERITY_HIGH = "high"
    SEVERITY_MEDIUM = "medium"
    SEVERITY_LOW = "low"
    SEVERITY_CRITICAL = "critical"


class TypeScriptValidator:
    """
    Validates TypeScript type correctness across all workspace packages.
    
    Runs `pnpm -r typecheck` and parses the output to identify type errors.
    """
    
    def __init__(self, stack_path: str):
        """
        Initialize the TypeScript validator.
        
        Args:
            stack_path: Path to the {project}-stack directory
        """
        self.stack_path = Path(stack_path).resolve()
        self.errors: List[Dict] = []
        self.warnings: List[str] = []
        
        # Validation settings
        self.max_errors = int(os.getenv('TYPESCRIPT_MAX_ERRORS', '0'))
        self.strict_mode = os.getenv('TYPESCRIPT_STRICT_MODE', 'true').lower() == 'true'
        self.ignore_templates = os.getenv('TYPESCRIPT_IGNORE_TEMPLATES', 'true').lower() == 'true'
    
    def validate(self) -> Dict:
        """
        Run TypeScript type checking and parse errors.
        
        Returns:
            Dict containing:
                - passed: bool
                - error_count: int
                - errors: List[Dict]
                - warnings: List[str]
        """
        if not self._check_prerequisites():
            prereq_error = create_error(
                file="N/A",
                message="Prerequisites not met: missing package.json or node_modules",
                category="TypeScript",
                severity=SEVERITY_HIGH,
                project_root=str(self.stack_path)
            )
            prereq_error["code"] = "PREREQ"
            
            return {
                'passed': False,
                'error_count': 1,
                'errors': [prereq_error],
                'warnings': self.warnings
            }
        
        # Run typecheck command
        result = self._run_typecheck()
        
        if result is None:
            cmd_error = create_error(
                file="N/A",
                message="Failed to execute typecheck command",
                category="TypeScript",
                severity=SEVERITY_HIGH,
                project_root=str(self.stack_path)
            )
            cmd_error["code"] = "CMD_FAILED"
            
            return {
                'passed': False,
                'error_count': 1,
                'errors': [cmd_error],
                'warnings': self.warnings
            }
        
        # Parse errors from output
        self._parse_errors(result.stdout + result.stderr)
        
        # Filter out template placeholder errors if configured
        if self.ignore_templates:
            self.errors = self._filter_template_errors(self.errors)
        
        # Check if validation passed
        error_count = len(self.errors)
        passed = error_count <= self.max_errors if not self.strict_mode else error_count == 0
        
        return {
            'passed': passed,
            'error_count': error_count,
            'errors': self.errors,
            'warnings': self.warnings
        }
    
    def _check_prerequisites(self) -> bool:
        """
        Check if the project has necessary files for type checking.
        
        Auto-runs 'pnpm install' if node_modules is missing.
        
        Returns:
            True if prerequisites are met, False otherwise
        """
        package_json = self.stack_path / 'package.json'
        node_modules = self.stack_path / 'node_modules'
        
        if not package_json.exists():
            self.warnings.append(f"Missing package.json at {self.stack_path}")
            return False
        
        if not node_modules.exists():
            self.warnings.append(f"Missing node_modules at {self.stack_path}. Running 'pnpm install'...")
            
            # Auto-run pnpm install
            try:
                import sys
                print(f"📦 Installing dependencies in {self.stack_path}...", file=sys.stderr)
                result = subprocess.run(
                    'pnpm install',
                    shell=True,
                    cwd=self.stack_path,
                    capture_output=True,
                    text=True,
                    timeout=600  # 10 minute timeout for install
                )
                
                if result.returncode == 0:
                    print("✅ Dependencies installed successfully", file=sys.stderr)
                    self.warnings.append("Auto-installed dependencies with 'pnpm install'")
                    return True
                else:
                    print(f"❌ pnpm install failed: {result.stderr}", file=sys.stderr)
                    self.warnings.append(f"Failed to install dependencies: {result.stderr[:200]}")
                    return False
                    
            except subprocess.TimeoutExpired:
                self.warnings.append("pnpm install timed out after 10 minutes")
                return False
            except Exception as e:
                self.warnings.append(f"Error running pnpm install: {str(e)}")
                return False
        
        return True
    
    def _run_typecheck(self) -> Optional[subprocess.CompletedProcess]:
        """
        Execute the typecheck command.
        
        Runs both 'typecheck' and 'type-check' to handle inconsistent naming.
        
        Returns:
            CompletedProcess result or None if command failed
        """
        all_output = ""
        all_errors = ""
        
        # Run both script names to catch all packages
        for script_name in ['typecheck', 'type-check']:
            try:
                cmd = f'pnpm -r {script_name}'
                result = subprocess.run(
                    cmd,
                    shell=True,
                    cwd=self.stack_path,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )
                
                all_output += result.stdout
                all_errors += result.stderr
                
            except subprocess.TimeoutExpired:
                self.warnings.append(f"TypeScript {script_name} timed out after 5 minutes")
            except Exception as e:
                # Silently skip if script doesn't exist
                pass
        
        # Check for pnpm recursive run failures
        combined_output = all_output + all_errors
        if 'ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL' in combined_output:
            self.warnings.append(
                "⚠️  pnpm stopped after first package failure. "
                "Some packages may not have been type-checked. "
                "Fix errors and re-run to validate all packages."
            )
        
        # Create a fake result object with combined output
        class CombinedResult:
            def __init__(self, stdout, stderr):
                self.stdout = stdout
                self.stderr = stderr
                self.returncode = 1 if 'error TS' in (stdout + stderr) else 0
        
        return CombinedResult(all_output, all_errors)
    
    def _parse_errors(self, output: str) -> None:
        """
        Parse TypeScript errors from command output.
        
        TypeScript error format:
        file(line,col): error TS####: message
        
        Also handles pnpm output with multiple formats:
        │ file(line,col): error TS####: message
        packages/module-kb/frontend typecheck: file(line,col): error TS####: message
        
        Args:
            output: Combined stdout and stderr from typecheck command
        """
        # Pattern for TypeScript errors
        # Example 1: hooks/useKbDocuments.ts(86,34): error TS2339: Property 'documents' does not exist on type 'KbDocument[]'.
        # Example 2: │ components/ChatInput.tsx(190,13): error TS2322: ...
        # Example 3: packages/module-kb/frontend typecheck: adminCard.tsx(10,38): error TS2307: ...
        # Example 4: packages/module-ws/frontend type-check: pages/WorkspaceDetailPage.tsx(76,8): error TS2307: ...
        error_pattern = r'^\s*(?:│\s*)?(?:.*?type-?check:\s*)?([^\s]+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+?)(?=\n|$)'
        
        for match in re.finditer(error_pattern, output, re.MULTILINE):
            file_path = match.group(1)
            line = int(match.group(2))
            column = int(match.group(3))
            error_code = match.group(4)
            message = match.group(5).strip()
            
            # Create standardized error
            standardized_error = create_error(
                file=file_path,
                message=f"{error_code}: {message}",
                category="TypeScript",
                severity=SEVERITY_HIGH,
                line=line,
                project_root=str(self.stack_path)
            )
            
            # Add TypeScript-specific fields
            standardized_error["column"] = column
            standardized_error["code"] = error_code
            
            self.errors.append(standardized_error)
    
    def _filter_template_errors(self, errors: List[Dict]) -> List[Dict]:
        """
        Filter out errors related to template placeholders.
        
        Template placeholders like @{{PROJECT_NAME}} should be ignored.
        
        Args:
            errors: List of error dictionaries
            
        Returns:
            Filtered list of errors
        """
        template_patterns = [
            r'@\{\{PROJECT_NAME\}\}',
            r'@\{\{[A-Z_]+\}\}',
            r'\{\{project\}\}',
            r'\{\{module\}\}'
        ]
        
        filtered_errors = []
        for error in errors:
            message = error['message']
            is_template_error = any(re.search(pattern, message) for pattern in template_patterns)
            
            if not is_template_error:
                filtered_errors.append(error)
            else:
                self.warnings.append(
                    f"Ignored template placeholder error at {error['file']}:{error['line']}"
                )
        
        return filtered_errors
    
    def get_summary(self) -> str:
        """
        Generate a human-readable summary of validation results.
        
        Returns:
            Summary string
        """
        error_count = len(self.errors)
        
        if error_count == 0:
            return "✅ TypeScript validation passed - no type errors found"
        
        summary = f"❌ TypeScript validation failed - {error_count} type error(s) found:\n\n"
        
        # Group errors by file
        errors_by_file: Dict[str, List[Dict]] = {}
        for error in self.errors:
            file_path = error['file']
            if file_path not in errors_by_file:
                errors_by_file[file_path] = []
            errors_by_file[file_path].append(error)
        
        # Format errors
        for file_path, file_errors in sorted(errors_by_file.items()):
            summary += f"📄 {file_path} ({len(file_errors)} error(s)):\n"
            for error in file_errors:
                line = error.get('line', 0)
                column = error.get('column', 0)
                message = error.get('message', 'Unknown error')
                summary += f"  Line {line}:{column} - {message}\n"
            summary += "\n"
        
        return summary.strip()
