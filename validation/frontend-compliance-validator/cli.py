"""
Frontend Compliance Validator CLI

Command line interface for the Frontend compliance validator.
Compatible with the CORA validation orchestrator.

Standard: 05_std_quality_VALIDATOR-OUTPUT
"""

import sys
import json
import argparse
import traceback
from pathlib import Path
from .validator import FrontendComplianceChecker

# Import shared output format utilities
try:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from shared.output_format import (
        create_error, 
        create_warning,
        extract_module_from_path,
        SEVERITY_HIGH,
        SEVERITY_MEDIUM,
        SEVERITY_LOW
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


def _standardize_issue(issue, file_path, project_root=None):
    """
    Convert validator issue to standard format.
    
    Args:
        issue: Original issue from validator (ComplianceIssue)
        file_path: File path where issue occurs
        project_root: Optional project root for path normalization
        
    Returns:
        Standardized issue dictionary
    """
    # Map issue types to severity
    # All frontend compliance issues are high severity since they're errors
    severity = SEVERITY_HIGH
    
    # Build message from issue type
    issue_type_messages = {
        "direct_fetch": "Direct fetch() call detected",
        "missing_org_context": "Missing organization context in multi-tenant hook",
        "missing_use_session": "Missing NextAuth session in hook using authenticated client",
        "styled_components": "Styled-components usage detected",
        "any_type": "TypeScript 'any' type detected",
        "missing_aria_label": "IconButton missing aria-label",
        "missing_error_handling": "Component with useQuery missing error handling",
        "missing_loading_state": "Component with useQuery missing loading state"
    }
    
    message = issue_type_messages.get(issue.issue_type, issue.issue_type)
    
    # Create standardized error
    return create_error(
        file=file_path,
        message=message,
        category="Frontend Compliance",
        severity=severity,
        line=issue.line_number,
        suggestion=issue.suggestion,
        project_root=project_root
    )


def main():
    parser = argparse.ArgumentParser(description="Frontend Compliance Validator")
    parser.add_argument("path", help="Path to project root")
    parser.add_argument("--format", choices=["json", "text"], default="text", help="Output format")
    
    args = parser.parse_args()
    
    try:
        root_dir = Path(args.path)
        if not root_dir.exists():
            print(json.dumps({"error": f"Path not found: {args.path}"}))
            sys.exit(1)
            
        checker = FrontendComplianceChecker(str(root_dir))
        
        # Find all frontend files
        files = checker.find_frontend_files()
        
        results = []
        errors = []
        warnings = []
        info = []
        
        if not files:
            info.append("No frontend files found")
        
        for file_path in files:
            try:
                result = checker.check_file(file_path)
                results.append(result.to_dict())
                
                # Convert issues to standard format
                if not result.is_compliant:
                    for issue in result.issues:
                        standardized = _standardize_issue(issue, result.path, str(root_dir))
                        errors.append(standardized)

            except Exception as e:
                # Create standardized error for file processing failure
                error = create_error(
                    file=str(file_path.relative_to(root_dir)),
                    message=f"Failed to check file: {str(e)}",
                    category="Frontend Compliance",
                    severity=SEVERITY_HIGH,
                    project_root=str(root_dir)
                )
                errors.append(error)
        
        overall_passed = len(errors) == 0
        
        output = {
            "passed": overall_passed,
            "errors": errors,
            "warnings": warnings,
            "info": info,
            "details": {
                "total_files": len(files),
                "compliant_files": sum(1 for r in results if r["is_compliant"]),
                "results": results
            }
        }
        
        if args.format == "json":
            print(json.dumps(output, indent=2))
        else:
            print("Frontend Compliance Report")
            print("==========================")
            print(f"Total Files: {output['details']['total_files']}")
            print(f"Compliant: {output['details']['compliant_files']}")
            print("")
            if errors:
                print("Errors:")
                for err in errors:
                    file_path = err.get('file', 'unknown')
                    line = err.get('line', '')
                    message = err.get('message', '')
                    suggestion = err.get('suggestion', '')
                    module = err.get('module', 'unknown')
                    
                    line_str = f":{line}" if line else ""
                    print(f"  [{module}] {file_path}{line_str}")
                    print(f"    {message}")
                    if suggestion:
                        print(f"    → {suggestion}")
            if warnings:
                print("Warnings:")
                for warn in warnings:
                    file_path = warn.get('file', 'unknown')
                    message = warn.get('message', '')
                    print(f"  - {file_path}: {message}")
        
        sys.exit(0 if overall_passed else 1)
            
    except Exception as e:
        error_out = {
            "passed": False,
            "errors": [create_error(
                file="validator",
                message=f"Validator failed: {str(e)}",
                category="Frontend Compliance",
                severity=SEVERITY_HIGH
            )],
            "warnings": [],
            "info": [traceback.format_exc()]
        }
        print(json.dumps(error_out) if args.format == "json" else f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
