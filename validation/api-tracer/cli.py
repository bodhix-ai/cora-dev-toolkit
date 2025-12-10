#!/usr/bin/env python3
"""
API Full Stack Tracer CLI

Command-line interface for validating API contracts across frontend, gateway, and Lambda layers.
Designed to be AI-friendly with JSON output and clear error messages.

Usage:
    python cli.py --path /path/to/project
    python cli.py --path pm-app-stack --output json
    python cli.py --path pm-app-stack --output markdown
"""

import sys
import logging
import click
from pathlib import Path
from dotenv import load_dotenv

# Add current directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from frontend_parser import FrontendParser
from gateway_parser import GatewayParser
from lambda_parser import LambdaParser
from validator import FullStackValidator
from reporter import Reporter

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@click.command()
@click.option(
    '--path',
    required=True,
    type=click.Path(exists=True),
    help='Path to project root to validate'
)
@click.option(
    '--output',
    type=click.Choice(['text', 'json', 'markdown'], case_sensitive=False),
    default='text',
    help='Output format (text, json, markdown). JSON is recommended for AI consumption.'
)
@click.option(
    '--verbose',
    is_flag=True,
    help='Enable verbose debug logging'
)
@click.option(
    '--frontend-only',
    is_flag=True,
    help='Parse frontend API calls only (testing)'
)
@click.option(
    '--gateway-only',
    is_flag=True,
    help='Parse API Gateway routes only (testing)'
)
@click.option(
    '--lambda-only',
    is_flag=True,
    help='Parse Lambda handlers only (testing)'
)
def validate(
    path: str, 
    output: str, 
    verbose: bool,
    frontend_only: bool,
    gateway_only: bool,
    lambda_only: bool
):
    """
    Validate API contracts across frontend, API Gateway, and Lambda layers.
    
    This tool parses all three layers and validates that API contracts are consistent.
    
    Example usage:
        
        # Validate entire project
        python cli.py --path pm-app-stack
        
        # Validate with JSON output (AI-friendly)
        python cli.py --path pm-app-stack --output json
        
        # Parse frontend only (testing)
        python cli.py --path pm-app-stack --frontend-only
    """
    # Set logging level
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Initialize parsers
        logger.info("Initializing API parsers...")
        frontend_parser = FrontendParser()
        gateway_parser = GatewayParser()
        lambda_parser = LambdaParser()
        reporter = Reporter()
        
        # Testing modes - parse single layer
        if frontend_only:
            logger.info("Parsing frontend API calls only...")
            frontend_path = Path(path) / 'packages'
            calls = frontend_parser.parse_directory(str(frontend_path))
            
            # Output results
            if output == 'json':
                import json
                print(json.dumps(frontend_parser.to_dict(), indent=2))
            else:
                print(f"\n✅ Found {len(calls)} frontend API calls")
                print(f"Unique endpoints: {len(frontend_parser.get_unique_endpoints())}")
                for endpoint in sorted(frontend_parser.get_unique_endpoints()):
                    print(f"  - {endpoint}")
            sys.exit(0)
        
        if gateway_only:
            logger.info("Parsing API Gateway routes only...")
            gateway_path = Path(path).parent / 'pm-app-infra' / 'modules' / 'modular-api-gateway'
            routes = gateway_parser.parse_directory(str(gateway_path))
            
            # Output results
            if output == 'json':
                import json
                print(json.dumps(gateway_parser.to_dict(), indent=2))
            else:
                print(f"\n✅ Found {len(routes)} API Gateway routes")
                print(f"Unique routes: {len(gateway_parser.get_unique_routes())}")
                for route in sorted(gateway_parser.get_unique_routes()):
                    print(f"  - {route}")
            sys.exit(0)
        
        if lambda_only:
            logger.info("Parsing Lambda handlers only...")
            lambda_path = Path(path) / 'packages'
            handlers = lambda_parser.parse_directory(str(lambda_path))
            
            # Output results
            if output == 'json':
                import json
                print(json.dumps(lambda_parser.to_dict(), indent=2))
            else:
                print(f"\n✅ Found {len(handlers)} Lambda route handlers")
                print(f"Unique routes: {len(lambda_parser.get_unique_routes())}")
                for route in sorted(lambda_parser.get_unique_routes()):
                    print(f"  - {route}")
            sys.exit(0)
        
        # Full validation (Session 7 implementation)
        logger.info(f"Validating API contracts for: {path}")
        validator = FullStackValidator(frontend_parser, gateway_parser, lambda_parser)
        report = validator.validate(path)
        
        # Format and output report
        formatted_report = reporter.format_report(report, output)
        print(formatted_report)
        
        # Exit with appropriate code
        if report.status == 'failed':
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Validation failed: {e}", exc_info=verbose)
        if output == 'json':
            import json
            error_output = {
                'status': 'error',
                'error': str(e),
                'error_type': type(e).__name__
            }
            print(json.dumps(error_output, indent=2))
        else:
            print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        sys.exit(2)


@click.group()
def cli():
    """API Full Stack Tracer - Validate API contracts across all layers."""
    pass


@cli.command()
def version():
    """Show version information."""
    print("API Full Stack Tracer v1.0.0")
    print("Part of Phase 1 Validation Tools for CORA Migration")
    sys.exit(0)


# Make validate the default command
cli.add_command(validate, name='validate')


if __name__ == '__main__':
    # If no command specified, run validate
    if len(sys.argv) == 1 or (len(sys.argv) > 1 and not sys.argv[1] in ['version', '--help', '--version']):
        validate()
    else:
        cli()
