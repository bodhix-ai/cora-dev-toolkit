"""
Frontend Compliance Validator CLI

Command line interface for the Frontend compliance validator.
Compatible with the CORA validation orchestrator.
"""

import sys
import json
import argparse
import traceback
from pathlib import Path
from .validator import FrontendComplianceChecker

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
                
                # Aggregate issues for summary
                if not result.is_compliant:
                    for issue in result.issues:
                        errors.append(f"{result.path}:{issue.line_number}: {issue.issue_type} - {issue.suggestion}")

            except Exception as e:
                errors.append(f"Failed to check {file_path}: {str(e)}")
        
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
                    print(f"  - {err}")
            if warnings:
                print("Warnings:")
                for warn in warnings:
                    print(f"  - {warn}")
            
    except Exception as e:
        error_out = {
            "passed": False,
            "errors": [f"Validator failed: {str(e)}", traceback.format_exc()],
            "warnings": [],
            "info": []
        }
        print(json.dumps(error_out) if args.format == "json" else f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
