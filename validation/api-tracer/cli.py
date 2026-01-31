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
    '--aws-profile',
    envvar='AWS_PROFILE',
    help='AWS CLI profile name (or set AWS_PROFILE in .env)'
)
@click.option(
    '--api-id',
    envvar='API_GATEWAY_ID',
    help='API Gateway ID (or set API_GATEWAY_ID in .env)'
)
@click.option(
    '--aws-region',
    envvar='AWS_REGION',
    default='us-east-1',
    help='AWS region (default: us-east-1)'
)
@click.option(
    '--prefer-terraform',
    is_flag=True,
    help='Force Terraform parsing even if AWS available'
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
@click.option(
    '--no-auth',
    is_flag=True,
    help='Disable auth lifecycle validation (ADR-019)'
)
@click.option(
    '--auth-only',
    is_flag=True,
    help='Run only auth lifecycle validation (ADR-019)'
)
@click.option(
    '--no-quality',
    is_flag=True,
    help='Disable code quality validation (import signatures, response format, etc.)'
)
@click.option(
    '--quality-only',
    is_flag=True,
    help='Run only code quality validation'
)
def validate(
    path: str, 
    output: str, 
    verbose: bool,
    aws_profile: str,
    api_id: str,
    aws_region: str,
    prefer_terraform: bool,
    frontend_only: bool,
    gateway_only: bool,
    lambda_only: bool,
    no_auth: bool,
    auth_only: bool,
    no_quality: bool,
    quality_only: bool
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
        
        # Auth validation mode handling
        validate_auth = not no_auth
        if auth_only:
            validate_auth = True
            logger.info("Running auth-only validation (ADR-019)")
        
        # Quality validation mode handling
        validate_quality = not no_quality
        if quality_only:
            validate_quality = True
            logger.info("Running quality-only validation")
        
        validator = FullStackValidator(
            frontend_parser, 
            gateway_parser, 
            lambda_parser,
            aws_profile=aws_profile,
            api_id=api_id,
            aws_region=aws_region,
            prefer_terraform=prefer_terraform,
            validate_auth=validate_auth
        )
        
        # For auth-only mode, we still run full validation but can filter output
        report = validator.validate(path)
        
        # Log auth validation summary
        if validate_auth and 'auth_validation' in report.summary:
            auth_summary = report.summary['auth_validation']
            logger.info(f"Auth validation: {auth_summary['errors']} errors, {auth_summary['warnings']} warnings")
        
        # Log code quality validation summary
        if validate_quality and 'code_quality_validation' in report.summary:
            quality_summary = report.summary['code_quality_validation']
            logger.info(f"Code quality validation: {quality_summary['errors']} errors, {quality_summary['warnings']} warnings")
            if quality_summary.get('by_category'):
                for category, count in quality_summary['by_category'].items():
                    logger.info(f"  - {category}: {count} issues")
        
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
            # Return standardized error format for orchestrator compatibility
            error_output = {
                'status': 'failed',
                'errors': [f"{type(e).__name__}: {str(e)}"],
                'warnings': [],
                'info': [],
                'summary': {
                    'total_issues': 1,
                    'errors': 1,
                    'warnings': 0,
                    'info': 0
                },
                'details': {
                    'error_type': type(e).__name__,
                    'validation_error': str(e)
                }
            }
            print(json.dumps(error_output, indent=2))
        else:
            print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        sys.exit(1)


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
    # If no command provided, default to validate  
    if len(sys.argv) == 1 or (len(sys.argv) > 1 and not sys.argv[1].startswith('--') and sys.argv[1] not in ['validate', 'version']):
        validate()
    else:
        cli()
