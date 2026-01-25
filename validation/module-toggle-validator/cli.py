"""CLI for Module Toggle Validator."""

import argparse
import sys
from pathlib import Path
from .validator import ModuleToggleValidator


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Validate CORA module toggle compliance"
    )
    parser.add_argument(
        "project_path",
        nargs="?",
        default=".",
        help="Path to project root (default: current directory)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show detailed output",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format",
    )
    
    args = parser.parse_args()
    
    # Resolve project path
    project_path = Path(args.project_path).resolve()
    
    if not project_path.exists():
        print(f"Error: Project path does not exist: {project_path}", file=sys.stderr)
        sys.exit(1)
    
    # Run validation
    validator = ModuleToggleValidator(str(project_path))
    results = validator.validate()
    
    # Output results
    if args.format == "json":
        import json
        print(json.dumps(results, indent=2))
    else:
        _print_text_output(results, args.verbose)
    
    # Exit with appropriate code
    sys.exit(0 if results["passed"] else 1)


def _print_text_output(results: dict, verbose: bool):
    """Print results in human-readable format."""
    print("\n" + "=" * 80)
    print("MODULE TOGGLE VALIDATOR")
    print("=" * 80 + "\n")
    
    summary = results["summary"]
    print(f"Modules checked: {summary['modules_checked']}")
    print(f"Admin cards checked: {summary['admin_cards_checked']}")
    print(f"Errors: {summary['errors']}")
    print(f"Warnings: {summary['warnings']}")
    print()
    
    # Print errors
    if results["errors"]:
        print("ERRORS:")
        print("-" * 80)
        for error in results["errors"]:
            file_name = error.get("file", "unknown")
            message = error["message"]
            rule = error.get("rule", "")
            module = error.get("module", "")
            card = error.get("card", "")
            
            print(f"  File: {file_name}")
            if module:
                print(f"  Module: {module}")
            if card:
                print(f"  Card: {card}")
            print(f"  Error: {message}")
            if rule:
                print(f"  Rule: {rule}")
            print()
    
    # Print warnings
    if results["warnings"]:
        print("\nWARNINGS:")
        print("-" * 80)
        for warning in results["warnings"]:
            file_name = warning.get("file", "unknown")
            message = warning["message"]
            rule = warning.get("rule", "")
            card = warning.get("card", "")
            
            print(f"  File: {file_name}")
            if card:
                print(f"  Card: {card}")
            print(f"  Warning: {message}")
            if rule:
                print(f"  Rule: {rule}")
            print()
    
    # Print summary
    print("=" * 80)
    if results["passed"]:
        print("✅ VALIDATION PASSED")
    else:
        print("❌ VALIDATION FAILED")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()