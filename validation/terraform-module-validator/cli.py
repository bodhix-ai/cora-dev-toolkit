#!/usr/bin/env python3
"""
Terraform Module Validator CLI

Command-line interface for the Terraform Module Validator.
"""

import sys
import argparse
import json
from pathlib import Path
from validator import TerraformModuleValidator

def main():
    parser = argparse.ArgumentParser(description='Validate Terraform module against CORA standards')
    parser.add_argument('command', choices=['validate'], help='Command to execute')
    parser.add_argument('--path', required=True, help='Path to Terraform module directory')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')
    
    args = parser.parse_args()
    
    if args.command == 'validate':
        validator = TerraformModuleValidator(args.path)
        result = validator.validate()
        
        if args.format == 'json':
            output = {
                'path': result.path,
                'passed': result.passed,
                'error_count': result.error_count,
                'warning_count': result.warning_count,
                'issues': [
                    {
                        'severity': i.severity,
                        'rule': i.rule,
                        'message': i.message,
                        'file': i.file,
                        'line': i.line
                    } for i in result.issues
                ]
            }
            print(json.dumps(output, indent=2))
            sys.exit(0 if result.passed else 1)
        else:
            print(f"\nTerraform Module Validation: {args.path}")
            print("=" * 60)
            
            if not result.issues:
                print("✅ All checks passed")
                sys.exit(0)
                
            for issue in result.issues:
                icon = "❌" if issue.severity in ['CRITICAL', 'HIGH'] else "⚠️"
                print(f"{icon} [{issue.severity}] {issue.file}: {issue.message}")
                print(f"   Rule: {issue.rule}\n")
                
            print("-" * 60)
            print(f"Summary: {result.error_count} errors, {result.warning_count} warnings")
            
            if result.error_count > 0:
                print("\n❌ FAILED")
                sys.exit(1)
            else:
                print("\n✅ PASSED")
                sys.exit(0)

if __name__ == '__main__':
    main()
