#!/usr/bin/env python3
"""
UI Library Validator CLI

Wraps the bash validation script for integration with cora-validate.py orchestrator.

Standard: 05_std_quality_VALIDATOR-OUTPUT
"""

import argparse
import json
import subprocess
import sys
import re
from pathlib import Path

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


def parse_bash_output(output: str, scan_path: str) -> list:
    """
    Parse bash script output to extract violations.
    
    Args:
        output: Raw output from bash script
        scan_path: Path that was scanned
        
    Returns:
        List of standardized error dictionaries
    """
    errors = []
    
    # Pattern to match violation lines:
    # ❌ VIOLATION: templates/_modules-core/module-access/frontend/components/SomeComponent.tsx
    violation_pattern = r'❌ VIOLATION:\s+(.+?)(?:\n|$)'
    
    for match in re.finditer(violation_pattern, output):
        file_path = match.group(1).strip()
        
        # Create standardized error
        standardized_error = create_error(
            file=file_path,
            message="UI library violation: Uses Tailwind CSS instead of Material-UI",
            category="UI Library",
            severity=SEVERITY_HIGH,
            suggestion="Replace Tailwind classes with Material-UI components and sx prop styling",
            project_root=scan_path
        )
        
        errors.append(standardized_error)
    
    # Also look for file paths with violation context (alternative format)
    file_pattern = r'(templates/[^\s]+\.tsx?)'
    for match in re.finditer(file_pattern, output):
        file_path = match.group(1)
        # Check if not already added
        if not any(e['file'] == file_path for e in errors):
            # Only add if there's violation context around it
            context_start = max(0, match.start() - 100)
            context_end = min(len(output), match.end() + 100)
            context = output[context_start:context_end]
            
            if 'VIOLATION' in context or 'className' in context:
                standardized_error = create_error(
                    file=file_path,
                    message="UI library violation: Uses Tailwind CSS instead of Material-UI",
                    category="UI Library",
                    severity=SEVERITY_HIGH,
                    suggestion="Replace Tailwind classes with Material-UI components and sx prop styling",
                    project_root=scan_path
                )
                errors.append(standardized_error)
    
    return errors


def run_validation(scan_path: str, output_format: str = "json") -> int:
    """
    Run UI library validation via bash script.
    
    Args:
        scan_path: Path to scan for violations
        output_format: Output format (text or json)
        
    Returns:
        Exit code (0 = pass, 1 = fail)
    """
    # Get path to bash validation script
    # Try multiple locations in order:
    # 1. Same directory as CLI (NEW location): validation/ui-library-validator/validate-ui-library.sh
    # 2. Toolkit legacy: ../../scripts/validate-ui-library.sh
    # 3. Project structure: ../../validate-ui-library.sh
    
    current_file = Path(__file__).resolve()
    
    # Try same directory first (NEW location after reorganization)
    same_dir_script = current_file.parent / "validate-ui-library.sh"
    
    # Try toolkit structure (legacy)
    toolkit_script = current_file.parent.parent.parent / "scripts" / "validate-ui-library.sh"
    
    # Try project structure (legacy)
    project_script = current_file.parent.parent.parent / "validate-ui-library.sh"
    
    # Find the script
    bash_script = None
    if same_dir_script.exists():
        bash_script = same_dir_script
    elif toolkit_script.exists():
        bash_script = toolkit_script
    elif project_script.exists():
        bash_script = project_script
    
    if not bash_script:
        error_msg = f"Validation script not found. Tried: {same_dir_script}, {toolkit_script}, {project_script}"
        
        script_error = create_error(
            file="N/A",
            message=error_msg,
            category="UI Library",
            severity=SEVERITY_HIGH,
            project_root=scan_path
        )
        
        if output_format == "json":
            print(json.dumps({
                "passed": False,
                "errors": [script_error],
                "warnings": [],
                "info": []
            }))
        else:
            print(f"ERROR: {error_msg}", file=sys.stderr)
        return 1
    
    # Run bash script
    try:
        result = subprocess.run(
            [str(bash_script), scan_path],
            capture_output=True,
            text=True,
            check=False
        )
        
        # Parse violations from output
        errors = []
        if result.returncode != 0:
            errors = parse_bash_output(result.stdout, scan_path)
        
        # Format output
        if output_format == "json":
            output = {
                "passed": result.returncode == 0,
                "errors": errors,
                "warnings": [],
                "info": [],
                "summary": {
                    "errors": len(errors),
                    "warnings": 0,
                    "total_issues": len(errors)
                }
            }
            print(json.dumps(output, indent=2))
        else:
            # Text format - print bash script output with summary
            print(result.stdout)
            if errors:
                print(f"\n❌ Found {len(errors)} UI library violation(s)")
            else:
                print("\n✅ No UI library violations found")
        
        return result.returncode
        
    except Exception as e:
        error_msg = f"Error running validation: {str(e)}"
        
        exception_error = create_error(
            file="N/A",
            message=error_msg,
            category="UI Library",
            severity=SEVERITY_HIGH,
            project_root=scan_path
        )
        
        if output_format == "json":
            print(json.dumps({
                "passed": False,
                "errors": [exception_error],
                "warnings": [],
                "info": []
            }))
        else:
            print(f"ERROR: {error_msg}", file=sys.stderr)
        return 1


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="ui-library-validator",
        description="CORA UI Library Compliance Validator"
    )
    parser.add_argument(
        "path",
        help="Path to scan for UI library violations"
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="json",
        help="Output format (default: json)"
    )
    
    args = parser.parse_args()
    
    return run_validation(args.path, args.format)


if __name__ == "__main__":
    sys.exit(main())
