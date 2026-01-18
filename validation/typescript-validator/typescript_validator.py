"""
TypeScript Type Check Validator

Runs TypeScript compiler in type-check mode across all packages.
Identifies type errors with file, line, and column information.

Part of CORA validation suite to prevent type errors before deployment.
"""

import subprocess
import re
import os
from pathlib import Path
from typing import Dict, List, Optional


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
            return {
                'passed': False,
                'error_count': 1,
                'errors': [{
                    'file': 'N/A',
                    'line': 0,
                    'column': 0,
                    'code': 'PREREQ',
                    'message': 'Prerequisites not met: missing package.json or node_modules'
                }],
                'warnings': self.warnings
            }
        
        # Run typecheck command
        result = self._run_typecheck()
        
        if result is None:
            return {
                'passed': False,
                'error_count': 1,
                'errors': [{
                    'file': 'N/A',
                    'line': 0,
                    'column': 0,
                    'code': 'CMD_FAILED',
                    'message': 'Failed to execute typecheck command'
                }],
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
        
        Returns:
            True if prerequisites are met, False otherwise
        """
        package_json = self.stack_path / 'package.json'
        node_modules = self.stack_path / 'node_modules'
        
        if not package_json.exists():
            self.warnings.append(f"Missing package.json at {self.stack_path}")
            return False
        
        if not node_modules.exists():
            self.warnings.append(f"Missing node_modules at {self.stack_path}. Run 'pnpm install' first.")
            return False
        
        return True
    
    def _run_typecheck(self) -> Optional[subprocess.CompletedProcess]:
        """
        Execute the typecheck command.
        
        Returns:
            CompletedProcess result or None if command failed
        """
        try:
            cmd = 'pnpm -r typecheck'
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=self.stack_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            return result
        except subprocess.TimeoutExpired:
            self.warnings.append("TypeScript typecheck timed out after 5 minutes")
            return None
        except Exception as e:
            self.warnings.append(f"Failed to run typecheck: {str(e)}")
            return None
    
    def _parse_errors(self, output: str) -> None:
        """
        Parse TypeScript errors from command output.
        
        TypeScript error format:
        file(line,col): error TS####: message
        
        Args:
            output: Combined stdout and stderr from typecheck command
        """
        # Pattern for TypeScript errors
        # Example: hooks/useKbDocuments.ts(86,34): error TS2339: Property 'documents' does not exist on type 'KbDocument[]'.
        error_pattern = r'([^\s]+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+?)(?=\n|$)'
        
        for match in re.finditer(error_pattern, output, re.MULTILINE):
            file_path = match.group(1)
            line = int(match.group(2))
            column = int(match.group(3))
            error_code = match.group(4)
            message = match.group(5).strip()
            
            self.errors.append({
                'file': file_path,
                'line': line,
                'column': column,
                'code': error_code,
                'message': message
            })
    
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
                summary += f"  Line {error['line']}:{error['column']} - {error['code']}: {error['message']}\n"
            summary += "\n"
        
        return summary.strip()
