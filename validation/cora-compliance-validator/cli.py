"""
CORA Compliance Validator CLI

Command line interface for the CORA compliance validator.
Compatible with the CORA validation orchestrator.
"""

import sys
import json
import argparse
import traceback
from pathlib import Path
from .validator import CoraComplianceChecker

def main():
    parser = argparse.ArgumentParser(description="CORA Compliance Validator")
    parser.add_argument("path", help="Path to project root")
    parser.add_argument("--format", choices=["json", "text"], default="text", help="Output format")
    
    args = parser.parse_args()
    
    try:
        root_dir = Path(args.path)
        if not root_dir.exists():
            print(json.dumps({"error": f"Path not found: {args.path}"}))
            sys.exit(1)
            
        checker = CoraComplianceChecker(str(root_dir))
        
        # Find all Lambda functions
        lambda_files = checker.find_lambda_functions()
        
        results = []
        errors = []
        warnings = []
        info = []
        
        if not lambda_files:
            info.append("No Lambda functions found")
        
        for file_path in lambda_files:
            try:
                result = checker.check_file(file_path)
                results.append(result.to_dict())
                
                # Aggregate issues for summary
                if not result.is_fully_compliant:
                    for std in result.standards:
                        if not std.is_compliant:
                            for issue in std.issues:
                                errors.append(f"{result.lambda_name}: {std.standard_name} - {issue}")
                        elif std.score < 1.0:
                             for issue in std.issues:
                                warnings.append(f"{result.lambda_name}: {std.standard_name} - {issue}")

            except Exception as e:
                errors.append(f"Failed to check {file_path}: {str(e)}")
        
        overall_passed = len(errors) == 0
        
        output = {
            "passed": overall_passed,
            "errors": errors,
            "warnings": warnings,
            "info": info,
            "details": {
                "total_lambdas": len(lambda_files),
                "compliant_lambdas": sum(1 for r in results if r["is_fully_compliant"]),
                "results": results
            }
        }
        
        if args.format == "json":
            print(json.dumps(output, indent=2))
        else:
            print("CORA Compliance Report")
            print("======================")
            print(f"Total Lambdas: {output['details']['total_lambdas']}")
            print(f"Compliant: {output['details']['compliant_lambdas']}")
            print("")
            if errors:
                print("Errors:")
                for err in errors:
                    print(f"  - {err}")
            if warnings:
                print("Warnings:")
                for warn in warnings:
                    print(f"  - {warn}")
        
        sys.exit(0 if overall_passed else 1)
            
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
