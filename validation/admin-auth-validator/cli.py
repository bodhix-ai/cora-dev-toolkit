#!/usr/bin/env python3
"""CLI for Admin Auth Validator."""

import json
import argparse
from pathlib import Path
from .validator import AdminAuthValidator


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Validate admin pages follow ADR-015 Pattern A authentication"
    )
    parser.add_argument("path", help="Path to project or module")
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format"
    )
    
    args = parser.parse_args()
    
    # Run validation
    validator = AdminAuthValidator(args.path)
    results = validator.validate()
    
    # Output results
    if args.format == "json":
        print(json.dumps(results, indent=2))
    else:
        # Text output
        print(f"\nAdmin Auth Validation Results")
        print("=" * 60)
        print(f"Total pages checked: {results['summary']['total_pages']}")
        print(f"Errors: {results['summary']['errors']}")
        print(f"Warnings: {results['summary']['warnings']}")
        print(f"Status: {'✓ PASSED' if results['passed'] else '✗ FAILED'}")
        
        if results['errors']:
            print("\nErrors:")
            for err in results['errors']:
                print(f"  {err['file']}: {err['message']}")
        
        if results['warnings']:
            print("\nWarnings:")
            for warn in results['warnings']:
                print(f"  {warn['file']}: {warn['message']}")
    
    return 0 if results['passed'] else 1


if __name__ == "__main__":
    exit(main())
