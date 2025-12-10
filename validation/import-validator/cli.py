#!/usr/bin/env python3
"""
Import Validator CLI
Command-line interface for validating Lambda function imports and frontend auth independence
"""
import sys
import os
from pathlib import Path
import click
from typing import Optional

from signature_loader import load_org_common_signatures, SignatureLoader
from backend_validator import BackendValidator, validate_lambda_directory
from frontend_validator import FrontendValidator, validate_frontend_directory
from reporter import print_results


@click.command()
@click.option(
    '--path',
    type=click.Path(exists=True),
    required=True,
    help='Path to directory or file to validate'
)
@click.option(
    '--backend',
    is_flag=True,
    default=False,
    help='Validate backend Lambda imports (default if no mode specified)'
)
@click.option(
    '--frontend',
    is_flag=True,
    default=False,
    help='Validate frontend auth independence'
)
@click.option(
    '--all',
    'validate_all',
    is_flag=True,
    default=False,
    help='Validate both backend and frontend'
)
@click.option(
    '--output',
    type=click.Choice(['text', 'json', 'markdown', 'summary']),
    default='text',
    help='Output format (default: text)'
)
@click.option(
    '--verbose',
    is_flag=True,
    help='Show detailed information (text format only)'
)
@click.option(
    '--base-path',
    type=click.Path(exists=True),
    default=None,
    help='Base path to pm-app-stack directory (auto-detected if not provided)'
)
def main(path: str, backend: bool, frontend: bool, validate_all: bool, output: str, verbose: bool, base_path: Optional[str]):
    """
    Validate imports and auth independence across backend and frontend code.
    
    BACKEND VALIDATION:
    - Unknown function parameters (e.g., error_if_not_found)
    - Deprecated parameters (e.g., order_by → order)
    - Missing required parameters
    - Invalid function names
    
    FRONTEND VALIDATION:
    - Direct auth provider imports (Clerk, NextAuth, Okta)
    - Auth hook usage in CORA modules
    - CORA auth-agnostic pattern compliance
    
    Examples:
    
        # Validate backend Lambda functions (default):
        python cli.py validate --path packages/
        
        # Validate frontend auth independence:
        python cli.py validate --path packages/ --frontend
        
        # Validate both backend and frontend:
        python cli.py validate --path packages/ --all
        
        # JSON output for CI/CD:
        python cli.py validate --path packages/ --frontend --output json
    """
    try:
        if base_path is None:
            # Auto-detect base path relative to this script
            script_dir = Path(__file__).parent
            base_path = script_dir.parent.parent.parent  # Go up to pm-app-stack
        
        # Determine validation mode
        # Default to backend if no flags specified
        if not backend and not frontend and not validate_all:
            backend = True
        
        # Run validations
        all_results = []
        total_errors = 0
        
        # Backend validation
        if backend or validate_all:
            click.echo("=" * 70)
            click.echo("BACKEND VALIDATION (Lambda Function Imports)")
            click.echo("=" * 70)
            click.echo("Loading org_common module signatures...")
            
            signatures = load_org_common_signatures(str(base_path))
            click.echo(f"Loaded {len(signatures)} function signatures\n")
            
            target_path = Path(path)
            
            if target_path.is_file() and str(target_path).endswith('.py'):
                click.echo(f"Validating file: {target_path}")
                validator = BackendValidator(signatures)
                file_result = validator.validate_file(str(target_path))
                backend_results = {
                    'files': [file_result],
                    'summary': validator.get_results()
                }
            else:
                click.echo(f"Validating directory: {target_path}\n")
                backend_results = validate_lambda_directory(str(target_path), signatures)
            
            # Display backend results
            formatted_output = print_results(backend_results, output_format=output, verbose=verbose)
            click.echo(formatted_output)
            
            total_errors += len(backend_results['summary']['errors'])
            all_results.append(('backend', backend_results))
            click.echo("")
        
        # Frontend validation
        if frontend or validate_all:
            click.echo("=" * 70)
            click.echo("FRONTEND VALIDATION (Auth Independence)")
            click.echo("=" * 70)
            click.echo(f"Validating directory: {path}\n")
            
            frontend_results = validate_frontend_directory(path, str(base_path))
            
            # Display frontend results
            formatted_output = print_results(frontend_results, output_format=output, verbose=verbose)
            click.echo(formatted_output)
            
            total_errors += len(frontend_results['summary']['errors'])
            all_results.append(('frontend', frontend_results))
            click.echo("")
        
        # Summary if both ran
        if validate_all and len(all_results) > 1:
            click.echo("=" * 70)
            click.echo("VALIDATION SUMMARY")
            click.echo("=" * 70)
            for validation_type, results in all_results:
                error_count = len(results['summary']['errors'])
                status = "✅ PASSED" if error_count == 0 else f"❌ FAILED ({error_count} errors)"
                click.echo(f"{validation_type.upper()}: {status}")
            click.echo("")
        
        # Exit with error code if any validation failed
        if total_errors > 0:
            sys.exit(1)
        else:
            sys.exit(0)
    
    except FileNotFoundError as e:
        click.echo(f"Error: {str(e)}", err=True)
        sys.exit(1)
    
    except Exception as e:
        click.echo(f"Unexpected error: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@click.command()
@click.option(
    '--base-path',
    type=click.Path(exists=True),
    default=None,
    help='Base path to pm-app-stack directory (auto-detected if not provided)'
)
def list_signatures(base_path: Optional[str]):
    """
    List all available function signatures from org_common module.
    
    This is useful for understanding what functions are available and their parameters.
    """
    try:
        if base_path is None:
            script_dir = Path(__file__).parent
            base_path = script_dir.parent.parent.parent
        
        click.echo("Loading org_common module signatures...\n")
        
        signatures = load_org_common_signatures(str(base_path))
        
        click.echo(f"Found {len(signatures)} functions in org_common:\n")
        
        # Group by module
        db_funcs = []
        validator_funcs = []
        other_funcs = []
        
        for name, sig in signatures.items():
            if 'org_common.db.' in name:
                continue  # Skip duplicates with module prefix
            
            formatted = SignatureLoader('').format_signature(name)
            
            if sig['file'] == 'db.py':
                db_funcs.append((name, formatted, sig))
            elif sig['file'] == 'validators.py':
                validator_funcs.append((name, formatted, sig))
            else:
                other_funcs.append((name, formatted, sig))
        
        # Display database functions
        if db_funcs:
            click.echo("Database Functions (db.py):")
            click.echo("─" * 70)
            for name, formatted, sig in sorted(db_funcs):
                click.echo(f"  {formatted}")
                if sig['deprecated']:
                    click.echo(f"    ⚠️  Deprecated params: {', '.join(sig['deprecated'])}")
            click.echo("")
        
        # Display validation functions
        if validator_funcs:
            click.echo("Validation Functions (validators.py):")
            click.echo("─" * 70)
            for name, formatted, sig in sorted(validator_funcs):
                click.echo(f"  {formatted}")
            click.echo("")
        
        # Display other functions
        if other_funcs:
            click.echo("Other Functions:")
            click.echo("─" * 70)
            for name, formatted, sig in sorted(other_funcs):
                click.echo(f"  {formatted}")
            click.echo("")
    
    except Exception as e:
        click.echo(f"Error: {str(e)}", err=True)
        sys.exit(1)


@click.group()
def cli():
    """Import Validator - Validate Lambda function imports against org_common signatures"""
    pass


cli.add_command(main, name='validate')
cli.add_command(list_signatures, name='list')


if __name__ == '__main__':
    # If no command provided, default to validate
    if len(sys.argv) == 1 or (len(sys.argv) > 1 and not sys.argv[1].startswith('--') and sys.argv[1] not in ['validate', 'list']):
        main()
    else:
        cli()
