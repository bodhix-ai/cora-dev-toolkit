#!/usr/bin/env python3
"""
UI Library Validator CLI

Wraps the bash validation script for integration with cora-validate.py orchestrator.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path


def run_validation(scan_path: str, output_format: str = "json") -> int:
    """
    Run UI library validation via bash script.
    
    Args:
        scan_path: Path to scan for violations
        output_format: Output format (text or json)
        
    Returns:
        Exit code (0 = pass, 1 = fail)
    """
    # Get path to bash validation script
    # Handle both Toolkit and Project structures:
    # - Toolkit: validation/ui-library-validator/cli.py → scripts/validate-ui-library.sh
    # - Project: scripts/validation/ui-library-validator/cli.py → scripts/validate-ui-library.sh
    
    current_file = Path(__file__)
    
    # Detect structure by checking if we're in scripts/validation/ or just validation/
    if current_file.parts[-4] == "scripts":
        # Project structure: scripts/validation/ui-library-validator/cli.py
        # Go up 3 levels to scripts/, then look for validate-ui-library.sh in same dir
        scripts_dir = current_file.parent.parent.parent
        bash_script = scripts_dir / "validate-ui-library.sh"
    else:
        # Toolkit structure: validation/ui-library-validator/cli.py
        # Go up 3 levels to root, then into scripts/
        base_dir = current_file.parent.parent.parent
        bash_script = base_dir / "scripts" / "validate-ui-library.sh"
        
    if not bash_script.exists():
        error_msg = f"Validation script not found at: {bash_script}"
        if output_format == "json":
            print(json.dumps({
                "passed": False,
                "errors": [error_msg],
                "warnings": [],
                "info": []
            }))
        else:
            print(f"ERROR: {error_msg}", file=sys.stderr)
        return 1
    
    # Run bash script
    try:
        result = subprocess.run(
            [str(bash_script), scan_path],
            capture_output=True,
            text=True,
            check=False
        )
        
        # Parse output for JSON format
        if output_format == "json":
            violations = []
            if result.returncode != 0:
                # Extract violation lines from output
                for line in result.stdout.split('\n'):
                    if '❌ VIOLATION' in line or 'templates/' in line:
                        violations.append(line.strip())
            
            output = {
                "passed": result.returncode == 0,
                "errors": violations if result.returncode != 0 else [],
                "warnings": [],
                "info": [],
                "details": {
                    "raw_output": result.stdout
                }
            }
            print(json.dumps(output, indent=2))
        else:
            # Text format - just print bash script output
            print(result.stdout)
        
        return result.returncode
        
    except Exception as e:
        error_msg = f"Error running validation: {str(e)}"
        if output_format == "json":
            print(json.dumps({
                "passed": False,
                "errors": [error_msg],
                "warnings": [],
                "info": []
            }))
        else:
            print(f"ERROR: {error_msg}", file=sys.stderr)
        return 1


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="ui-library-validator",
        description="CORA UI Library Compliance Validator"
    )
    parser.add_argument(
        "path",
        help="Path to scan for UI library violations"
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="json",
        help="Output format (default: json)"
    )
    
    args = parser.parse_args()
    
    return run_validation(args.path, args.format)


if __name__ == "__main__":
    sys.exit(main())
