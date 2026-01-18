#!/usr/bin/env python3
"""
TypeScript Type Check Validator CLI

Command-line interface for TypeScript validation.
Compatible with CORA validation orchestrator.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Optional

# Add current and parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import from the same directory
from typescript_validator import TypeScriptValidator


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser."""
    parser = argparse.ArgumentParser(
        prog="typescript-validator",
        description="Validate TypeScript type correctness across all workspace packages",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate with text output
  python -m typescript-validator.cli /path/to/project-stack
  
  # Validate with JSON output
  python -m typescript-validator.cli /path/to/project-stack --format json
  
  # Save results to file
  python -m typescript-validator.cli /path/to/project-stack --format json --output results.json
"""
    )
    
    parser.add_argument(
        "path",
        help="Path to project stack directory"
    )
    
    parser.add_argument(
        "--format", "-f",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Write output to file instead of stdout"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    
    return parser


def format_text_output(result: dict, validator: TypeScriptValidator) -> str:
    """
    Format validation results as human-readable text.
    
    Args:
        result: Validation result dictionary
        validator: Validator instance (for summary method)
        
    Returns:
        Formatted text string
    """
    return validator.get_summary()


def format_json_output(result: dict) -> str:
    """
    Format validation results as JSON.
    
    Args:
        result: Validation result dictionary
        
    Returns:
        JSON string
    """
    # Convert result to JSON-compatible format
    output = {
        "passed": result["passed"],
        "errors": result["errors"],
        "warnings": result["warnings"],
        "error_count": result["error_count"],
    }
    
    # Add summary for compatibility
    output["summary"] = {
        "errors": result["error_count"],
        "warnings": len(result["warnings"]),
    }
    
    return json.dumps(output, indent=2)


def main() -> int:
    """
    Main entry point.
    
    Returns:
        Exit code (0 = success, 1 = validation failed)
    """
    parser = create_parser()
    args = parser.parse_args()
    
    # Validate path exists
    stack_path = Path(args.path)
    if not stack_path.exists():
        print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1
    
    # Run validation
    validator = TypeScriptValidator(str(stack_path.resolve()))
    result = validator.validate()
    
    # Format output
    if args.format == "json":
        output = format_json_output(result)
    else:
        output = format_text_output(result, validator)
    
    # Write output
    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        if args.verbose:
            print(f"Results written to: {args.output}", file=sys.stderr)
    else:
        print(output)
    
    # Return exit code
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
