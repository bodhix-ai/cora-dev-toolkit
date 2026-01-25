#!/usr/bin/env python3
"""
Workspace Plugin Architecture Validator CLI

Validates compliance with ADR-017: WS Plugin Architecture.

Checks:
1. Plugin modules don't import directly from module-ws
2. Plugin modules use workspace-plugin from shared package
3. WorkspacePluginProvider is used in apps/web

Plugin modules: module-kb, module-chat, module-voice, module-eval
"""

import sys
import json
import argparse
import re
from pathlib import Path
from typing import List, Dict, Tuple

# Plugin modules that should NOT import from module-ws
PLUGIN_MODULES = ["module-kb", "module-chat", "module-voice", "module-eval"]

# Valid import pattern (from shared)
VALID_IMPORT_PATTERN = r'from\s+["\']@[\w-]+/shared/workspace-plugin["\']'

# Invalid import patterns (direct from module-ws)
INVALID_IMPORT_PATTERNS = [
    r'from\s+["\']@[\w-]+/module-ws["\']',
    r'import\s+.*\s+from\s+["\']@[\w-]+/module-ws["\']',
]

class ValidationResult:
    def __init__(self):
        self.errors: List[Tuple[str, int, str]] = []
        self.warnings: List[Tuple[str, int, str]] = []
        self.info: List[str] = []
        
    def add_error(self, file: str, line: int, message: str):
        self.errors.append((file, line, message))
    
    def add_warning(self, file: str, line: int, message: str):
        self.warnings.append((file, line, message))
        
    def add_info(self, message: str):
        self.info.append(message)
    
    def has_errors(self) -> bool:
        return len(self.errors) > 0
    
    def print_report(self, modules_checked: list, files_checked: int, path: str) -> int:
        """Print text report and return exit code."""
        print("\n" + "="*80)
        print("WORKSPACE PLUGIN ARCHITECTURE VALIDATION - DETAILED RESULTS")
        print("="*80)
        
        # Module-level errors section
        module_errors = [(f, l, m) for f, l, m in self.errors if l == 0 and not f.startswith("packages/")]
        file_errors = [(f, l, m) for f, l, m in self.errors if l != 0 or f.startswith("packages/")]
        
        if module_errors:
            print("\n" + "-"*80)
            print("MODULE-LEVEL VIOLATIONS (ADR-017)")
            print("-"*80)
            for file, line, msg in module_errors:
                print(f"\n❌ {file}")
                print(f"   {msg}")
        
        if file_errors:
            print("\n" + "-"*80)
            print("FILE-LEVEL ERRORS")
            print("-"*80)
            for file, line, msg in file_errors:
                print(f"\n❌ {file}:{line}")
                print(f"   {msg}")
        
        if self.warnings:
            print("\n" + "-"*80)
            print("WARNINGS - Files That May Need Workspace Plugin")
            print("-"*80)
            print(f"\n{len(self.warnings)} file(s) appear to use workspace data but don't import workspace-plugin:")
            
            # Group warnings by module
            warnings_by_module = {}
            for file, line, msg in self.warnings:
                for module in ["module-kb", "module-chat", "module-voice", "module-eval"]:
                    if f"packages/{module}/" in str(file):
                        if module not in warnings_by_module:
                            warnings_by_module[module] = []
                        warnings_by_module[module].append((file, msg))
                        break
            
            for module, warns in warnings_by_module.items():
                print(f"\n  {module}: {len(warns)} file(s)")
                for file, msg in warns[:3]:  # Show first 3
                    print(f"    • {file}")
                if len(warns) > 3:
                    print(f"    ... and {len(warns) - 3} more")
        
        if self.info:
            print("\n" + "-"*80)
            print("COMPLIANT FILES")
            print("-"*80)
            for msg in self.info:
                if "✓" in msg:
                    print(f"\n✅ {msg}")
        
        # Summary section at the BOTTOM
        print("\n" + "="*80)
        print("VALIDATION SUMMARY")
        print("="*80)
        print(f"\n📂 Path:           {path}")
        print(f"📦 Modules:        {', '.join(modules_checked)}")
        print(f"📄 Files Checked:  {files_checked}")
        print(f"\n🔍 Module-Level:   {len(module_errors)} violation(s)")
        print(f"⚠️  File Warnings:  {len(self.warnings)}")
        print(f"❌ Total Errors:   {len(self.errors)}")
        
        if self.errors:
            print(f"\n❌ FAILED - {len(module_errors)} module(s) not using workspace-plugin pattern")
        else:
            print(f"\n✅ PASSED - All modules compliant with ADR-017")
        
        print("="*80 + "\n")
        
        return 1 if self.errors else 0


def find_typescript_files(path: Path, plugin_modules: List[str]) -> List[Path]:
    """Find TypeScript files in plugin modules."""
    ts_files = []
    
    if path.is_file() and path.suffix in ['.ts', '.tsx']:
        return [path]
    
    # Search in plugin module directories
    for module in plugin_modules:
        # Search in packages/module-*/frontend
        module_paths = list(path.rglob(f"packages/{module}/frontend/**/*.ts"))
        module_paths.extend(path.rglob(f"packages/{module}/frontend/**/*.tsx"))
        ts_files.extend(module_paths)
    
    return ts_files


def validate_file(file_path: Path, result: ValidationResult, project_root: Path, module_integration_status: Dict[str, Dict]):
    """Validate a single TypeScript file for workspace plugin compliance."""
    try:
        content = file_path.read_text()
        lines = content.split('\n')
        
        # Get relative path for reporting
        try:
            rel_path = file_path.relative_to(project_root)
        except ValueError:
            rel_path = file_path
        
        # Determine which module this file belongs to
        module_name = None
        for module in PLUGIN_MODULES:
            if f"packages/{module}/frontend" in str(rel_path):
                module_name = module
                break
        
        if not module_name:
            return
        
        # Check for invalid imports (direct from module-ws)
        for i, line in enumerate(lines, 1):
            for pattern in INVALID_IMPORT_PATTERNS:
                if re.search(pattern, line):
                    result.add_error(
                        str(rel_path),
                        i,
                        f"ADR-017: Direct import from module-ws detected. Use '@{{PROJECT}}/shared/workspace-plugin' instead."
                    )
                    module_integration_status[module_name]["has_violations"] = True
                    break
        
        # Check for valid workspace plugin usage
        has_valid_import = any(re.search(VALID_IMPORT_PATTERN, line) for line in lines)
        uses_hook = "useWorkspacePlugin" in content
        
        if has_valid_import:
            module_integration_status[module_name]["files_with_import"] += 1
            if uses_hook:
                module_integration_status[module_name]["files_using_hook"] += 1
                result.add_info(f"{rel_path}: ✓ Uses workspace-plugin correctly")
        
        # Check if file appears to need workspace context but doesn't use it
        # Look for common workspace-related patterns
        workspace_indicators = [
            r'\bworkspaceId\b',
            r'\bworkspace\.',
            r'workspace:',
            r'currentWorkspace',
            r'workspaceConfig',
        ]
        
        needs_workspace = any(re.search(pattern, content, re.IGNORECASE) for pattern in workspace_indicators)
        
        if needs_workspace and not has_valid_import:
            # Check if it's importing from module-ws instead
            has_module_ws_import = any(re.search(pattern, content) for pattern in INVALID_IMPORT_PATTERNS)
            if not has_module_ws_import:
                result.add_warning(
                    str(rel_path),
                    0,
                    f"File appears to use workspace data but doesn't import workspace-plugin. Consider using useWorkspacePlugin if workspace context is needed."
                )
    
    except Exception as e:
        result.add_warning(str(file_path), 0, f"Failed to read file: {e}")


def check_provider_usage(path: Path, result: ValidationResult):
    """Check if WorkspacePluginProvider is used in apps/web."""
    apps_web = path / "apps" / "web"
    
    if not apps_web.exists():
        result.add_warning("", 0, "apps/web directory not found")
        return
    
    # Look for WorkspacePluginProvider usage
    provider_files = []
    for ts_file in apps_web.rglob("**/*.tsx"):
        try:
            content = ts_file.read_text()
            if "WorkspacePluginProvider" in content:
                provider_files.append(ts_file)
        except:
            continue
    
    if not provider_files:
        result.add_error(
            "apps/web",
            0,
            "ADR-017: WorkspacePluginProvider not found in apps/web. Add it to provide workspace context to plugins."
        )
    else:
        result.add_info(f"✓ WorkspacePluginProvider found in {len(provider_files)} file(s)")


def main():
    parser = argparse.ArgumentParser(
        description="Workspace Plugin Architecture Validator (ADR-017)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate project
  ./cli.py /path/to/project-stack

  # Validate with JSON output
  ./cli.py /path/to/project-stack --format json
        """
    )
    parser.add_argument("path", help="Path to project-stack directory")
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format"
    )
    parser.add_argument(
        "--module",
        choices=PLUGIN_MODULES,
        help="Check only specific module"
    )
    
    args = parser.parse_args()
    
    path = Path(args.path).resolve()
    
    if not path.exists():
        if args.format == "json":
            print(json.dumps({
                "errors": [{"file": "", "line": 0, "message": f"Path not found: {args.path}"}],
                "warnings": [],
                "info": [],
                "passed": False
            }))
        else:
            print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1
    
    # Determine which modules to check
    modules_to_check = [args.module] if args.module else PLUGIN_MODULES
    
    # Find TypeScript files in plugin modules
    ts_files = find_typescript_files(path, modules_to_check)
    
    if not ts_files:
        if args.format == "json":
            print(json.dumps({
                "errors": [],
                "warnings": [{"file": "", "line": 0, "message": "No TypeScript files found in plugin modules"}],
                "info": [],
                "passed": True
            }))
        else:
            print("Warning: No TypeScript files found in plugin modules", file=sys.stderr)
        return 0
    
    # Run validation
    result = ValidationResult()
    
    # Initialize module integration status tracking
    module_integration_status = {
        module: {
            "files_with_import": 0,
            "files_using_hook": 0,
            "has_violations": False
        }
        for module in modules_to_check
    }
    
    result.add_info(f"Checking {len(ts_files)} TypeScript files in plugin modules: {', '.join(modules_to_check)}")
    
    for ts_file in ts_files:
        validate_file(ts_file, result, path, module_integration_status)
    
    # Check for WorkspacePluginProvider usage
    if not args.module:  # Only check provider if validating all modules
        check_provider_usage(path, result)
    
    # Add module-level integration report
    for module, status in module_integration_status.items():
        if status["files_with_import"] == 0 and not status["has_violations"]:
            result.add_error(
                f"{module}",
                0,
                f"ADR-017: Module has NO files using workspace-plugin. Module must use useWorkspacePlugin from '@{{PROJECT}}/shared/workspace-plugin' to access workspace context."
            )
        elif status["files_with_import"] > 0:
            result.add_info(
                f"✓ {module}: {status['files_with_import']} file(s) import workspace-plugin, "
                f"{status['files_using_hook']} file(s) use the hook"
            )
    
    # Format output
    if args.format == "json":
        output = {
            "errors": [
                {"file": str(f), "line": line, "message": msg}
                for f, line, msg in result.errors
            ],
            "warnings": [
                {"file": str(f), "line": line, "message": msg}
                for f, line, msg in result.warnings
            ],
            "info": result.info,
            "passed": not result.has_errors(),
            "details": {
                "files_checked": len(ts_files),
                "modules_checked": modules_to_check,
                "total_errors": len(result.errors),
                "total_warnings": len(result.warnings),
            }
        }
        print(json.dumps(output, indent=2))
    else:
        # Text format - detailed report with summary at bottom
        exit_code = result.print_report(modules_to_check, len(ts_files), str(path))
        return exit_code
    
    return 0 if not result.has_errors() else 1


if __name__ == "__main__":
    sys.exit(main())