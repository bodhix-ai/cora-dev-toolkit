#!/usr/bin/env python3
"""
CORA Portability Validator CLI

Command-line interface for detecting hardcoded values that prevent portability.

Usage:
    python -m portability_validator.cli /path/to/project
    python -m portability_validator.cli /path/to/module --project-name my-app
"""

import sys
import json
import argparse
from pathlib import Path

from .validator import PortabilityValidator


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        prog="portability-validator",
        description="CORA Portability Validator - Detect hardcoded values",
        epilog="""
Examples:
  # Validate a project
  python -m portability_validator.cli /path/to/project

  # Validate with project name detection
  python -m portability_validator.cli /path/to/project --project-name pm-app

  # JSON output
  python -m portability_validator.cli /path/to/project --format json

  # Save report
  python -m portability_validator.cli /path/to/project --format markdown --output report.md
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "path",
        help="Path to project or directory to validate"
    )

    parser.add_argument(
        "--project-name", "-p",
        help="Project name to detect as hardcoded value"
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
    dim = lambda t: color(t, "2")

    # Header
    lines.append("=" * 70)
    lines.append(bold("CORA Portability Validation Report"))
    lines.append("=" * 70)
    lines.append("")
    
    # Summary
    lines.append(f"Target: {result['target_path']}")
    lines.append(f"Files Scanned: {result['files_scanned']}")
    
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
            lines.append(f"    File: {error['file']}:{error['line']}")
            lines.append(f"    Match: {dim(error['matched_value'])}")
            lines.append(f"    Line: {dim(error['line_content'])}")
            if error.get('suggestion'):
                lines.append(f"    Suggestion: {error['suggestion']}")
            lines.append("")
    
    if result['warnings']:
        lines.append("-" * 70)
        lines.append(yellow("Warnings:"))
        for warning in result['warnings']:
            lines.append(f"  ⚠ {warning['message']}")
            lines.append(f"    File: {warning['file']}:{warning['line']}")
            lines.append(f"    Match: {dim(warning['matched_value'])}")
            if warning.get('suggestion'):
                lines.append(f"    Suggestion: {warning['suggestion']}")
            lines.append("")
    
    if result['info']:
        lines.append("-" * 70)
        lines.append("Info:")
        for info in result['info'][:10]:  # Limit to first 10
            lines.append(f"  ℹ {info['message']}")
            lines.append(f"    File: {info['file']}:{info['line']}")
        if len(result['info']) > 10:
            lines.append(f"  ... and {len(result['info']) - 10} more")
        lines.append("")
    
    lines.append("=" * 70)
    
    return "\n".join(lines)


def format_markdown(result: dict) -> str:
    """Format result as markdown."""
    lines = []
    
    # Header
    lines.append("# CORA Portability Validation Report")
    lines.append("")
    
    # Summary
    status_emoji = "✅" if result['passed'] else "❌"
    lines.append("## Summary")
    lines.append("")
    lines.append("| Property | Value |")
    lines.append("|----------|-------|")
    lines.append(f"| Target | `{result['target_path']}` |")
    lines.append(f"| Files Scanned | {result['files_scanned']} |")
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
            lines.append(f"- **File:** `{error['file']}:{error['line']}`")
            lines.append(f"- **Pattern:** `{error['pattern']}`")
            lines.append(f"- **Match:** `{error['matched_value']}`")
            if error.get('suggestion'):
                lines.append(f"- **Suggestion:** {error['suggestion']}")
            lines.append("")
            lines.append("```")
            lines.append(error['line_content'])
            lines.append("```")
            lines.append("")
    
    # Warnings
    if result['warnings']:
        lines.append("## ⚠️ Warnings")
        lines.append("")
        for warning in result['warnings']:
            lines.append(f"### {warning['message']}")
            lines.append("")
            lines.append(f"- **File:** `{warning['file']}:{warning['line']}`")
            lines.append(f"- **Pattern:** `{warning['pattern']}`")
            lines.append(f"- **Match:** `{warning['matched_value']}`")
            if warning.get('suggestion'):
                lines.append(f"- **Suggestion:** {warning['suggestion']}")
            lines.append("")
    
    # Info (summarized)
    if result['info']:
        lines.append("## ℹ️ Info")
        lines.append("")
        lines.append(f"Found {len(result['info'])} informational items.")
        lines.append("")
        lines.append("<details>")
        lines.append("<summary>Click to expand</summary>")
        lines.append("")
        for info in result['info'][:20]:
            lines.append(f"- `{info['file']}:{info['line']}` - {info['message']}")
        if len(result['info']) > 20:
            lines.append(f"- ... and {len(result['info']) - 20} more")
        lines.append("")
        lines.append("</details>")
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
    validator = PortabilityValidator(verbose=args.verbose)
    
    if args.project_name:
        validator.add_project_name_pattern(args.project_name)
    
    result = validator.validate_path(str(path.resolve()))

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
