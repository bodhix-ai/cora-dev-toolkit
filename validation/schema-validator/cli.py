#!/usr/bin/env python3
"""
Schema Validator CLI

Command-line interface for validating Lambda database queries against Supabase schema.
Designed to be AI-friendly with JSON output and clear error messages.

Usage:
    python cli.py --path /path/to/lambda/files
    python cli.py --path lambda_function.py --output json
    python cli.py --path packages/ --propose-fixes --output markdown
    
    # Template mode (no database required - uses SQL files)
    python cli.py --path /path/to/templates --static
"""

import sys
import logging
import click
from pathlib import Path
from dotenv import load_dotenv

# Add current directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from schema_inspector import SchemaInspector
from query_parser import QueryParser
from validator import Validator
from fix_proposer import FixProposer
from reporter import Reporter
from static_schema_parser import StaticSchemaParser, find_schema_sql_files

# Note: .env loading moved into validate() function to support project-specific .env files

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
    help='Path to Lambda file or directory to validate'
)
@click.option(
    '--output',
    type=click.Choice(['text', 'json', 'markdown'], case_sensitive=False),
    default='text',
    help='Output format (text, json, markdown). JSON is recommended for AI consumption.'
)
@click.option(
    '--propose-fixes',
    is_flag=True,
    help='Generate proposed fixes for validation errors'
)
@click.option(
    '--verbose',
    is_flag=True,
    help='Enable verbose debug logging'
)
@click.option(
    '--clear-cache',
    is_flag=True,
    help='Clear schema cache and force re-introspection'
)
@click.option(
    '--static',
    is_flag=True,
    help='Use static schema parsing from SQL files (no database required). For template validation.'
)
@click.option(
    '--schema-path',
    type=click.Path(exists=True),
    default=None,
    help='Path to directory containing SQL schema files (used with --static)'
)
def validate(path: str, output: str, propose_fixes: bool, verbose: bool, clear_cache: bool, static: bool, schema_path: str):
    """
    Validate Lambda database queries against Supabase schema.
    
    This tool parses Lambda Python files, extracts Supabase queries,
    and validates them against the actual database schema.
    
    Example usage:
        
        # Validate a single file
        python cli.py --path lambda_function.py
        
        # Validate a directory with JSON output (AI-friendly)
        python cli.py --path packages/ --output json
        
        # Validate and propose fixes
        python cli.py --path packages/ --propose-fixes
        
    Environment variables required (from .env file) - NOT needed with --static flag:
        SUPABASE_DB_HOST
        SUPABASE_DB_PORT (optional, defaults to 5432)
        SUPABASE_DB_NAME
        SUPABASE_DB_USER
        SUPABASE_DB_PASSWORD
    """
    # Set logging level
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    path_obj = Path(path)
    schema_inspector = None
    
    # Static mode: use SQL files for schema instead of live database
    if static:
        logger.info("Using static schema parsing (no database connection required)")
        
        # Determine schema path
        if schema_path:
            schema_base = Path(schema_path)
        else:
            # Auto-detect schema location
            # Look for schema files in the target path or parent directories
            schema_base = path_obj if path_obj.is_dir() else path_obj.parent
            
            # If target is inside templates/, look at toolkit root
            current = schema_base
            while current != current.parent:
                if current.name == 'templates' or (current / 'templates').exists():
                    if current.name == 'templates':
                        schema_base = current.parent
                    else:
                        schema_base = current
                    break
                current = current.parent
        
        logger.info(f"Looking for schema SQL files in: {schema_base}")
        sql_files = find_schema_sql_files(schema_base)
        
        if not sql_files:
            logger.warning(f"No schema SQL files found in {schema_base}")
            if output == 'json':
                import json
                print(json.dumps({
                    'status': 'passed',
                    'errors': [],
                    'warnings': [f'No schema SQL files found for static validation'],
                    'info': ['Static schema validation skipped - no SQL files found']
                }, indent=2))
            else:
                print("⚠️ No schema SQL files found for static validation")
            sys.exit(0)
        
        # Parse static schema
        static_parser = StaticSchemaParser()
        static_schema = static_parser.parse_sql_files(sql_files)
        logger.info(f"Loaded {len(static_schema)} tables from SQL files")
        
        # Create a wrapper that provides the schema dict
        class StaticSchemaWrapper:
            """Wrapper to make static schema compatible with Validator."""
            def __init__(self, schema_dict):
                self._schema = schema_dict
            
            def introspect_schema(self):
                return self._schema
            
            def close(self):
                pass
        
        schema_inspector = StaticSchemaWrapper(static_schema)
    else:
        # Live database mode - load .env and connect
        # Priority: 
        # 1. Project's scripts/validation/.env (if validating a project)
        # 2. Validator's directory .env (fallback)
        
        # Try to find project root (look for scripts/validation/.env)
        env_locations = []
        
        # If path is a directory, check if it has scripts/validation/.env
        if path_obj.is_dir():
            project_env = path_obj / 'scripts' / 'validation' / '.env'
            if project_env.exists():
                env_locations.append(project_env)
        
        # Check parent directories for project root
        current = path_obj if path_obj.is_dir() else path_obj.parent
        for _ in range(5):  # Check up to 5 levels up
            project_env = current / 'scripts' / 'validation' / '.env'
            if project_env.exists():
                env_locations.append(project_env)
                break
            parent = current.parent
            if parent == current:  # Reached filesystem root
                break
            current = parent
        
        # Fallback to validator's .env
        validator_env = Path(__file__).parent / '.env'
        if validator_env.exists():
            env_locations.append(validator_env)
        
        # Load the first .env file found
        if env_locations:
            env_file = env_locations[0]
            logger.info(f"Loading environment from: {env_file}")
            load_dotenv(env_file)
        else:
            logger.warning("No .env file found. Database credentials must be set via environment variables.")
        
        logger.info("Initializing schema validator with live database...")
        schema_inspector = SchemaInspector()
        
        # Clear cache if requested
        if clear_cache:
            logger.info("Clearing schema cache...")
            schema_inspector.clear_cache()
    
    try:
        # Initialize remaining components
        query_parser = QueryParser()
        validator = Validator(schema_inspector, query_parser)
        reporter = Reporter()
        
        # Validate
        logger.info(f"Validating: {path}")
        report = validator.validate(path)
        
        # Propose fixes if requested
        fixes = None
        if propose_fixes and report.errors:
            logger.info("Generating proposed fixes...")
            fix_proposer = FixProposer()
            fixes = fix_proposer.propose_fixes(report.errors)
        
        # Format and output report
        formatted_report = reporter.format_report(report, fixes, output)
        print(formatted_report)
        
        # Cleanup
        schema_inspector.close()
        
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
    """Schema Validator - Validate Lambda queries against Supabase schema."""
    pass


@cli.command()
def check_credentials():
    """Check if database credentials are properly configured."""
    import os
    
    required_vars = [
        'SUPABASE_DB_HOST',
        'SUPABASE_DB_NAME',
        'SUPABASE_DB_USER',
        'SUPABASE_DB_PASSWORD'
    ]
    
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print("❌ Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nPlease create a .env file with these variables.")
        sys.exit(1)
    else:
        print("✅ All required environment variables are configured.")
        sys.exit(0)


@cli.command()
@click.option('--output', type=click.Choice(['text', 'json'], case_sensitive=False), default='text')
def list_tables(output: str):
    """List all tables in the database schema."""
    try:
        schema_inspector = SchemaInspector()
        tables = schema_inspector.get_all_tables()
        
        if output == 'json':
            import json
            print(json.dumps({'tables': sorted(tables)}, indent=2))
        else:
            print(f"\n📊 Found {len(tables)} tables:")
            for table in sorted(tables):
                print(f"   - {table}")
            print()
        
        schema_inspector.close()
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Failed to list tables: {e}")
        sys.exit(1)


# Make validate the default command
cli.add_command(validate, name='validate')


if __name__ == '__main__':
    # If no command specified, run validate
    if len(sys.argv) == 1 or (len(sys.argv) > 1 and not sys.argv[1] in ['check-credentials', 'list-tables', '--help', '--version']):
        validate()
    else:
        cli()
