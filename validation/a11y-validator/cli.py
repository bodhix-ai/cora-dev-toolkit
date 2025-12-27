#!/usr/bin/env python3
"""
Section 508 Accessibility Validator CLI
Command-line interface for validating React/TypeScript components
"""

import argparse
import sys
from pathlib import Path

from .validator import validate_path, A11yValidator
from .reporter import Reporter


def create_parser() -> argparse.ArgumentParser:
    """Create and configure argument parser."""
    parser = argparse.ArgumentParser(
        prog='a11y-validator',
        description='Section 508 Accessibility Validator for React/TypeScript components',
        epilog="""
Examples:
  # Validate a directory with text output
  python -m a11y_validator.cli packages/kb-module/src/components

  # Validate with JSON output
  python -m a11y_validator.cli packages/ --format json

  # Save report to file
  python -m a11y_validator.cli packages/ --format markdown --output report.md

  # Validate single file
  python -m a11y_validator.cli apps/web/components/ChatList.tsx --verbose

ICT Baseline Coverage:
  - Baseline 1: Keyboard Access
  - Baseline 2: Focus Visible & Order
  - Baseline 5: Name, Role, Value
  - Baseline 6: Images (alt text, IconButton labels)
  - Baseline 7: Sensory Characteristics
  - Baseline 8: Contrast Minimum (partial)
  - Baseline 10: Forms (labels, error messages)
  - Baseline 11: Page Titles
  - Baseline 13: Content Structure (heading hierarchy)
  - Baseline 14: Links (purpose, text)
  - Baseline 19: Frames (iframe title)

Manual testing required for:
  - Focus order (runtime behavior)
  - Precise contrast ratios (use WebAIM tool)
  - Audio/video accessibility
  - Timed events
  - Text resize
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # Positional argument
    parser.add_argument(
        'path',
        type=str,
        help='Path to file or directory to validate'
    )

    # Output format
    parser.add_argument(
        '-f', '--format',
        type=str,
        choices=['text', 'json', 'markdown'],
        default='text',
        help='Output format (default: text)'
    )

    # Output file
    parser.add_argument(
        '-o', '--output',
        type=str,
        help='Write report to file (instead of stdout)'
    )

    # Verbose mode
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )

    # Disable colors
    parser.add_argument(
        '--no-color',
        action='store_true',
        help='Disable colored output'
    )

    # Fail on warnings
    parser.add_argument(
        '--strict',
        action='store_true',
        help='Exit with error code if warnings found (not just errors)'
    )

    # Filter by severity
    parser.add_argument(
        '--severity',
        type=str,
        choices=['error', 'warning', 'info', 'all'],
        default='all',
        help='Filter issues by severity (default: all)'
    )

    # Filter by baseline test
    parser.add_argument(
        '--baseline',
        type=str,
        help='Filter issues by baseline test ID (e.g., "6.A", "10.A")'
    )

    # Show baseline coverage
    parser.add_argument(
        '--show-coverage',
        action='store_true',
        help='Show which baseline tests are covered by automated validation'
    )

    return parser


def filter_results(results: dict, severity: str = 'all', baseline: str = None) -> dict:
    """
    Filter validation results by severity and/or baseline test.
    
    Args:
        results: Full validation results
        severity: Severity level to filter by
        baseline: Baseline test ID to filter by
        
    Returns:
        Filtered results
    """
    filtered_results = {**results}
    
    # Filter by severity
    if severity != 'all':
        if severity == 'error':
            filtered_results['warnings'] = []
            filtered_results['info'] = []
        elif severity == 'warning':
            filtered_results['errors'] = []
            filtered_results['info'] = []
        elif severity == 'info':
            filtered_results['errors'] = []
            filtered_results['warnings'] = []
    
    # Filter by baseline test
    if baseline:
        def filter_by_baseline(issues):
            return [issue for issue in issues if issue.get('baseline_test') == baseline]
        
        filtered_results['errors'] = filter_by_baseline(filtered_results['errors'])
        filtered_results['warnings'] = filter_by_baseline(filtered_results['warnings'])
        filtered_results['info'] = filter_by_baseline(filtered_results['info'])
    
    # Update summary
    filtered_results['summary']['errors'] = len(filtered_results['errors'])
    filtered_results['summary']['warnings'] = len(filtered_results['warnings'])
    filtered_results['summary']['info'] = len(filtered_results['info'])
    filtered_results['summary']['total_issues'] = (
        len(filtered_results['errors']) + 
        len(filtered_results['warnings']) + 
        len(filtered_results['info'])
    )
    
    # Update status
    if filtered_results['summary']['errors'] > 0:
        filtered_results['status'] = 'failed'
    else:
        filtered_results['status'] = 'passed'
    
    return filtered_results


def show_baseline_coverage():
    """Display baseline test coverage information."""
    print("=" * 80)
    print("ICT Baseline for Web v3.1 - Automated Validation Coverage")
    print("=" * 80)
    print()
    
    automated = [
        ("1.A", "Keyboard Access", "✓ Partial", "Detects missing keyboard handlers"),
        ("2.A", "Focus Visible", "✓ Partial", "Detects removed outlines"),
        ("2.B", "Focus Order", "✗ Manual", "Requires runtime testing"),
        ("5.A", "Name, Role, Value - Name", "✓ Full", "Button labels, ARIA names"),
        ("5.B", "Name, Role, Value - Role", "✓ Partial", "Invalid ARIA roles"),
        ("5.C", "Name, Role, Value - State", "✓ Partial", "Missing ARIA states"),
        ("6.A", "Images - Meaningful", "✓ Full", "Missing alt text, IconButton labels"),
        ("6.B", "Images - Decorative", "✓ Full", "Decorative image verification"),
        ("7.A", "Sensory Characteristics", "✓ Partial", "Hardcoded colors detected"),
        ("8.A", "Contrast Minimum", "✓ Partial", "Hardcoded colors flagged for manual check"),
        ("10.A", "Forms - Label", "✓ Full", "Missing labels, placeholder-only"),
        ("10.C", "Forms - Error Identification", "✓ Partial", "Missing aria-invalid"),
        ("11.A", "Page Titles", "✓ Partial", "Missing page titles"),
        ("13.A", "Content Structure - Headings", "✓ Full", "Heading hierarchy validation"),
        ("13.B", "Content Structure - Lists", "✓ Partial", "List structure validation"),
        ("14.A", "Links - Purpose", "✓ Full", "Empty links, vague link text"),
        ("16.A", "Audio-Only", "✗ Manual", "Requires transcript review"),
        ("17.A", "Media Player Controls", "✗ Manual", "Requires runtime testing"),
        ("19.A", "Frames - Title", "✓ Full", "Missing iframe titles"),
        ("21.A", "Timed Events", "✗ Manual", "Requires runtime testing"),
        ("22.A", "Resize Text", "✗ Manual", "Requires browser zoom testing"),
    ]
    
    print(f"{'Test':<8} {'Name':<35} {'Status':<12} {'Notes'}")
    print("-" * 80)
    
    for test_id, name, status, notes in automated:
        print(f"{test_id:<8} {name:<35} {status:<12} {notes}")
    
    print()
    print("Legend:")
    print("  ✓ Full    - Fully automated validation")
    print("  ✓ Partial - Automated detection with manual verification recommended")
    print("  ✗ Manual  - Manual testing required")
    print()


def main():
    """Main CLI entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    # Show baseline coverage if requested
    if args.show_coverage:
        show_baseline_coverage()
        return 0
    
    # Validate path exists
    path = Path(args.path)
    if not path.exists():
        print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1
    
    try:
        # Run validation
        if args.verbose:
            print(f"Validating: {args.path}")
            print()
        
        results = validate_path(
            path=args.path,
            output_format=args.format,
            output_file=args.output,
            verbose=args.verbose,
            use_colors=not args.no_color
        )
        
        # Apply filters
        if args.severity != 'all' or args.baseline:
            results = filter_results(results, args.severity, args.baseline)
            
            # Regenerate report with filtered results
            reporter = Reporter(use_colors=not args.no_color)
            report = reporter.generate_report(results, args.format, args.output)
            
            if not args.output:
                print(report)
        
        # Determine exit code
        if args.strict:
            # Fail on errors or warnings
            if results['summary']['errors'] > 0 or results['summary']['warnings'] > 0:
                return 1
        else:
            # Fail only on errors
            if results['summary']['errors'] > 0:
                return 1
        
        return 0
    
    except Exception as e:
        # Return JSON error if JSON format requested
        if args.format == 'json':
            import json
            error_result = {
                "status": "failed",
                "errors": [str(e)],
                "warnings": [],
                "info": [],
                "summary": {
                    "total_files": 0,
                    "files_with_issues": 0,
                    "total_issues": 1,
                    "errors": 1,
                    "warnings": 0,
                    "info": 0
                },
                "details": {
                    "validation_error": str(e)
                }
            }
            output = json.dumps(error_result, indent=2)
            if args.output:
                with open(args.output, 'w') as f:
                    f.write(output)
            else:
                print(output)
        else:
            print(f"Error: {e}", file=sys.stderr)
        
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
