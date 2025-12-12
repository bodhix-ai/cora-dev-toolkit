#!/usr/bin/env python3
"""
CORA Structure Validator CLI

Command-line interface for validating project and module structure.

Usage:
    python -m structure_validator.cli /path/to/project
    python -m structure_validator.cli /path/to/module --module
"""

import sys
import json
import argparse
from pathlib import Path

from .validator import StructureValidator


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        prog="structure-validator",
        description="CORA Structure Validator - Validate project and module structure",
        epilog="""
Examples:
  # Validate a project
  python -m structure_validator.cli /path/to/my-project-stack

  # Validate a module
  python -m structure_validator.cli /path/to/module-kb --module

  # JSON output
  python -m structure_validator.cli /path/to/project --format json

  # Save report
  python -m structure_validator.cli /path/to/project --format markdown --output report.md
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "path",
        help="Path to project or module to validate"
    )

    parser.add_argument(
        "--module", "-m",
        action="store_true",
        help="Validate as module (default: validate as project)"
    )

    parser.add_argument(
        "--format", "-f",
        choices=["text", "json", "markdown"],
        default="text",
        help="Output format (default: text)"
    )

    parser.add_argument(
        "--output", "-o",
        help="Write report to file"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )

    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable colored output"
    )

    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with error code if warnings found"
    )

    return parser


def format_text(result: dict, use_colors: bool = True) -> str:
    """Format result as text."""
    lines = []
    
    def color(text: str, code: str) -> str:
        if not use_colors:
            return text
        return f"\033[{code}m{text}\033[0m"
    
    green = lambda t: color(t, "32")
    red = lambda t: color(t, "31")
    yellow = lambda t: color(t, "33")
    bold = lambda t: color(t, "1")

    # Header
    lines.append("=" * 70)
    lines.append(bold("CORA Structure Validation Report"))
    lines.append("=" * 70)
    lines.append("")
    
    # Summary
    lines.append(f"Target: {result['target_path']}")
    lines.append(f"Type: {result['validation_type']}")
    
    status = green("✓ PASSED") if result['passed'] else red("✗ FAILED")
    lines.append(f"Status: {status}")
    lines.append("")
    
    summary = result['summary']
    lines.append(f"Errors: {red(str(summary['errors'])) if summary['errors'] else '0'}")
    lines.append(f"Warnings: {yellow(str(summary['warnings'])) if summary['warnings'] else '0'}")
    lines.append(f"Info: {summary['info']}")
    lines.append("")
    
    # Issues
    if result['errors']:
        lines.append("-" * 70)
        lines.append(red("Errors:"))
        for error in result['errors']:
            lines.append(f"  ✗ {error['message']}")
            lines.append(f"    Path: {error['path']}")
            lines.append(f"    Rule: {error['rule']}")
            if error.get('suggestion'):
                lines.append(f"    Suggestion: {error['suggestion']}")
        lines.append("")
    
    if result['warnings']:
        lines.append("-" * 70)
        lines.append(yellow("Warnings:"))
        for warning in result['warnings']:
            lines.append(f"  ⚠ {warning['message']}")
            lines.append(f"    Path: {warning['path']}")
            lines.append(f"    Rule: {warning['rule']}")
            if warning.get('suggestion'):
                lines.append(f"    Suggestion: {warning['suggestion']}")
        lines.append("")
    
    if result['info']:
        lines.append("-" * 70)
        lines.append("Info:")
        for info in result['info']:
            lines.append(f"  ℹ {info['message']}")
        lines.append("")
    
    lines.append("=" * 70)
    
    return "\n".join(lines)


def format_markdown(result: dict) -> str:
    """Format result as markdown."""
    lines = []
    
    # Header
    lines.append("# CORA Structure Validation Report")
    lines.append("")
    
    # Summary
    status_emoji = "✅" if result['passed'] else "❌"
    lines.append("## Summary")
    lines.append("")
    lines.append("| Property | Value |")
    lines.append("|----------|-------|")
    lines.append(f"| Target | `{result['target_path']}` |")
    lines.append(f"| Type | {result['validation_type']} |")
    lines.append(f"| Status | {status_emoji} {'PASSED' if result['passed'] else 'FAILED'} |")
    lines.append(f"| Errors | {result['summary']['errors']} |")
    lines.append(f"| Warnings | {result['summary']['warnings']} |")
    lines.append(f"| Info | {result['summary']['info']} |")
    lines.append("")
    
    # Errors
    if result['errors']:
        lines.append("## ❌ Errors")
        lines.append("")
        for error in result['errors']:
            lines.append(f"### {error['message']}")
            lines.append("")
            lines.append(f"- **Path:** `{error['path']}`")
            lines.append(f"- **Rule:** `{error['rule']}`")
            if error.get('suggestion'):
                lines.append(f"- **Suggestion:** {error['suggestion']}")
            lines.append("")
    
    # Warnings
    if result['warnings']:
        lines.append("## ⚠️ Warnings")
        lines.append("")
        for warning in result['warnings']:
            lines.append(f"### {warning['message']}")
            lines.append("")
            lines.append(f"- **Path:** `{warning['path']}`")
            lines.append(f"- **Rule:** `{warning['rule']}`")
            if warning.get('suggestion'):
                lines.append(f"- **Suggestion:** {warning['suggestion']}")
            lines.append("")
    
    # Info
    if result['info']:
        lines.append("## ℹ️ Info")
        lines.append("")
        for info in result['info']:
            lines.append(f"- {info['message']}")
        lines.append("")
    
    return "\n".join(lines)


def main():
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()

    # Validate path exists
    path = Path(args.path)
    if not path.exists():
        print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1

    # Run validation
    validator = StructureValidator(verbose=args.verbose)
    
    if args.module:
        result = validator.validate_module(str(path.resolve()))
    else:
        result = validator.validate_project(str(path.resolve()))

    # Convert to dict
    result_dict = result.to_dict()

    # Format output
    if args.format == "json":
        output = json.dumps(result_dict, indent=2)
    elif args.format == "markdown":
        output = format_markdown(result_dict)
    else:
        output = format_text(result_dict, use_colors=not args.no_color)

    # Write output
    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Report written to: {args.output}")
    else:
        print(output)

    # Determine exit code
    if args.strict:
        if result_dict['summary']['errors'] > 0 or result_dict['summary']['warnings'] > 0:
            return 1
    else:
        if result_dict['summary']['errors'] > 0:
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
