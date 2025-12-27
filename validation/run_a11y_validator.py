#!/usr/bin/env python3
"""
Wrapper script to run the a11y validator with proper imports.
This script works around the Python module import limitation with hyphens in directory names.
"""
import sys
from pathlib import Path

# Add the a11y-validator directory to the path
validator_dir = Path(__file__).parent / "a11y-validator"
sys.path.insert(0, str(validator_dir))

# Now import and run the CLI
from validator import validate_path
from reporter import Reporter

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Section 508 Accessibility Validator for React/TypeScript components',
        epilog="""
Examples:
  # Validate the entire project
  python3 run_a11y_validator.py --target-dir .
  
  # Validate a specific directory with verbose output
  python3 run_a11y_validator.py --target-dir packages/module-ai --verbose
  
  # Generate JSON report
  python3 run_a11y_validator.py --target-dir packages/ --format json --output report.json
  
  # Generate markdown report
  python3 run_a11y_validator.py --target-dir packages/ --format markdown --output report.md
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--target-dir',
        type=str,
        default='.',
        help='Target directory to validate (default: current directory)'
    )
    parser.add_argument(
        '--format',
        type=str,
        default='text',
        choices=['text', 'json', 'markdown'],
        help='Output format (default: text)'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='Write report to file (instead of stdout)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Verbose output showing file processing'
    )
    parser.add_argument(
        '--no-color',
        action='store_true',
        help='Disable colored output'
    )
    parser.add_argument(
        '--strict',
        action='store_true',
        help='Exit with error code if warnings found (not just errors)'
    )
    
    args = parser.parse_args()
    
    # Run validation
    try:
        results = validate_path(
            path=args.target_dir,
            output_format=args.format,
            output_file=args.output,
            verbose=args.verbose,
            use_colors=not args.no_color
        )
        
        # Determine exit code
        if args.strict:
            # Fail on errors or warnings
            if results['summary']['errors'] > 0 or results['summary']['warnings'] > 0:
                sys.exit(1)
        else:
            # Fail only on errors
            if results['summary']['errors'] > 0:
                sys.exit(1)
        
        sys.exit(0)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)
