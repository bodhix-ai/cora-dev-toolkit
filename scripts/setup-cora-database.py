#!/usr/bin/env python3
"""
CORA Database Setup Script

Reads configuration from setup.config.yaml and deploys database schemas
to Supabase. This enables end-to-end automated project setup.

Usage:
    ./setup-cora-database.py --config setup.config.yaml [OPTIONS]
    
Options:
    --config FILE       Path to setup configuration file
    --module MODULE     Deploy only a specific module (access, ai, mgmt)
    --dry-run           Show what would be executed without making changes
    --validate-only     Only run validation, don't deploy schemas
    --help              Show this help message

Environment Variables (alternative to config file):
    SUPABASE_URL            Supabase project URL
    SUPABASE_SERVICE_KEY    Supabase service role key
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Try to import yaml, provide helpful error if not available
try:
    import yaml
except ImportError:
    print("Error: PyYAML is required. Install with: pip install pyyaml")
    sys.exit(1)

# Try to import requests for API calls
try:
    import requests
except ImportError:
    print("Error: requests is required. Install with: pip install requests")
    sys.exit(1)

# Try to import psycopg2 for direct database connection
try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR = Path(__file__).parent.resolve()
TOOLKIT_ROOT = SCRIPT_DIR.parent
CORE_MODULES_DIR = TOOLKIT_ROOT / "templates" / "_cora-core-modules"

# Schema files for each core module, in dependency order
CORE_MODULE_SCHEMAS = {
    "module-access": [
        "001-orgs.sql",
        "002-profiles.sql",
        "003-org-members.sql",
    ],
    "module-ai": [
        "001-ai-providers.sql",
        "002-ai-models.sql",
        "003-ai-validation-history.sql",
        "004-ai-validation-progress.sql",
        "005-ai-provider-model-summary-view.sql",
    ],
    "module-mgmt": [
        "000-schema-introspection-rpc.sql",  # RPC functions for schema validation
        "001-platform-lambda-config.sql",
        "002-rls-policies.sql",
        "003-platform-module-registry.sql",
        "004-platform-module-usage.sql",
        "005-platform-module-rls.sql",
    ],
}

# Standalone RPC functions that should be deployed first (before other schemas)
# These enable schema validation to work correctly
RPC_FUNCTIONS_FILE = "000-schema-introspection-rpc.sql"

# Module deployment order (based on tier dependencies)
MODULE_ORDER = ["module-access", "module-ai", "module-mgmt"]


# =============================================================================
# Console Output Helpers
# =============================================================================

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


def log_info(msg: str) -> None:
    print(f"{Colors.GREEN}[INFO]{Colors.NC} {msg}")


def log_warn(msg: str) -> None:
    print(f"{Colors.YELLOW}[WARN]{Colors.NC} {msg}")


def log_error(msg: str) -> None:
    print(f"{Colors.RED}[ERROR]{Colors.NC} {msg}")


def log_step(msg: str) -> None:
    print(f"{Colors.BLUE}[STEP]{Colors.NC} {msg}")


def log_success(msg: str) -> None:
    print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {msg}")


# =============================================================================
# Configuration Loading
# =============================================================================

def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from YAML file."""
    path = Path(config_path)
    
    if not path.exists():
        log_error(f"Configuration file not found: {config_path}")
        sys.exit(1)
    
    with open(path, 'r') as f:
        config = yaml.safe_load(f)
    
    return config


def get_supabase_credentials(config: Optional[Dict[str, Any]] = None) -> Tuple[str, str]:
    """Get Supabase credentials from config or environment."""
    # Try config first
    if config and config.get('supabase'):
        url = config['supabase'].get('url', '')
        key = config['supabase'].get('service_role_key', '')
        if url and key:
            return url, key
    
    # Fall back to environment variables
    url = os.environ.get('SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''))
    
    if not url or not key:
        log_error("Supabase credentials not found.")
        log_error("Provide via config file or environment variables:")
        log_error("  SUPABASE_URL and SUPABASE_SERVICE_KEY")
        sys.exit(1)
    
    return url, key


# =============================================================================
# Database Operations
# =============================================================================

def execute_sql(supabase_url: str, service_key: str, sql: str, dry_run: bool = False) -> Dict[str, Any]:
    """Execute SQL against Supabase using the REST API."""
    
    if dry_run:
        # Truncate SQL for display
        preview = sql[:200] + "..." if len(sql) > 200 else sql
        log_info(f"[DRY RUN] Would execute SQL:\n{preview}")
        return {"success": True, "dry_run": True}
    
    # Use Supabase's SQL endpoint
    # Note: This uses the pg_graphql extension's rpc endpoint
    # For direct SQL, we'll use the postgrest rpc endpoint with a custom function
    
    # Actually, for schema deployment, we should use psql or the SQL Editor API
    # Let's use the Supabase Management API or fall back to pg REST
    
    # For now, we'll use the REST API with a custom RPC function
    # This requires the function to exist - let's create it first or use direct approach
    
    # Alternative: Use the postgREST pg_query function if available
    # Or parse and execute individual statements
    
    # For this implementation, we'll use direct HTTP to the database
    # via Supabase's SQL execution endpoint (if available in your plan)
    
    endpoint = f"{supabase_url}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    
    try:
        response = requests.post(
            endpoint,
            headers=headers,
            json={"query": sql},
            timeout=60
        )
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        elif response.status_code == 404:
            # exec_sql function doesn't exist - need alternative approach
            return {"success": False, "error": "exec_sql function not found", "fallback_needed": True}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
    
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}


def execute_sql_direct(supabase_url: str, service_key: str, sql: str, dry_run: bool = False, config: Dict = None) -> Dict[str, Any]:
    """
    Execute SQL using direct database connection or REST API.
    
    For schema deployment, tries methods in order:
    1. Direct PostgreSQL connection (if psycopg2 and credentials available)
    2. REST API exec_sql RPC function
    3. Output SQL for manual execution
    
    This function outputs the SQL for manual execution if direct execution isn't possible.
    """
    
    if dry_run:
        preview = sql[:500] + "\n..." if len(sql) > 500 else sql
        log_info(f"[DRY RUN] Would execute SQL:\n{preview}")
        return {"success": True, "dry_run": True}
    
    # Method 1: Try direct PostgreSQL connection first
    if PSYCOPG2_AVAILABLE and config and config.get('supabase', {}).get('db'):
        db_config = config['supabase']['db']
        result = execute_sql_via_psycopg2(db_config, sql)
        if result.get("success"):
            return result
        else:
            log_warn(f"Direct PostgreSQL execution failed: {result.get('error')}")
    
    # Method 2: Try the REST approach
    result = execute_sql(supabase_url, service_key, sql, dry_run=False)
    
    if result.get("fallback_needed"):
        log_warn("Direct SQL execution not available via REST API.")
        log_warn("The SQL has been saved for manual execution.")
        return {"success": False, "manual_required": True, "sql": sql}
    
    return result


def execute_sql_via_psycopg2(db_config: Dict, sql: str) -> Dict[str, Any]:
    """
    Execute SQL via direct PostgreSQL connection using psycopg2.
    
    Args:
        db_config: Dictionary with host, port, name, user, password
        sql: SQL to execute
        
    Returns:
        Dictionary with success status and any errors
    """
    if not PSYCOPG2_AVAILABLE:
        return {"success": False, "error": "psycopg2 not installed"}
    
    host = db_config.get('host')
    port = db_config.get('port', 5432)
    dbname = db_config.get('name', 'postgres')
    user = db_config.get('user')
    password = db_config.get('password')
    
    if not all([host, user, password]):
        return {"success": False, "error": "Missing database credentials in config"}
    
    log_info(f"Connecting to PostgreSQL at {host}:{port}/{dbname}...")
    
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password,
            sslmode='require'
        )
        conn.autocommit = True
        
        with conn.cursor() as cur:
            # Execute the SQL (may contain multiple statements)
            cur.execute(sql)
        
        conn.close()
        log_success("SQL executed successfully via direct PostgreSQL connection")
        return {"success": True}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# Schema Deployment
# =============================================================================

def get_schema_files(module: str) -> List[Path]:
    """Get list of schema files for a module."""
    module_dir = CORE_MODULES_DIR / module / "db" / "schema"
    
    if not module_dir.exists():
        log_warn(f"Schema directory not found: {module_dir}")
        return []
    
    schema_files = []
    expected_files = CORE_MODULE_SCHEMAS.get(module, [])
    
    for filename in expected_files:
        file_path = module_dir / filename
        if file_path.exists():
            schema_files.append(file_path)
        else:
            log_warn(f"Schema file not found: {file_path}")
    
    return schema_files


def read_sql_file(file_path: Path) -> str:
    """Read SQL content from a file."""
    with open(file_path, 'r') as f:
        return f.read()


def deploy_module_schema(
    module: str,
    supabase_url: str,
    service_key: str,
    dry_run: bool = False,
    config: Dict = None
) -> Dict[str, Any]:
    """Deploy all schema files for a module."""
    
    log_step(f"Deploying schema for {module}...")
    
    schema_files = get_schema_files(module)
    
    if not schema_files:
        log_warn(f"No schema files found for {module}")
        return {"success": False, "error": "No schema files found"}
    
    results = []
    all_sql = []
    
    for file_path in schema_files:
        log_info(f"  Processing: {file_path.name}")
        sql = read_sql_file(file_path)
        all_sql.append(f"-- File: {file_path.name}\n{sql}")
        
        if dry_run:
            results.append({"file": file_path.name, "success": True, "dry_run": True})
        else:
            # For actual execution, we'll batch all SQL
            results.append({"file": file_path.name, "queued": True})
    
    # Combine all SQL for the module
    combined_sql = "\n\n".join(all_sql)
    
    if not dry_run:
        result = execute_sql_direct(supabase_url, service_key, combined_sql, dry_run, config)
        
        if result.get("manual_required"):
            # Save SQL for manual execution
            output_file = f"{module}-schema-deployment.sql"
            with open(output_file, 'w') as f:
                f.write(combined_sql)
            log_info(f"SQL saved to: {output_file}")
            log_info("Please run this SQL in the Supabase Dashboard SQL Editor.")
            return {"success": False, "manual_required": True, "file": output_file}
        
        return result
    
    return {"success": True, "dry_run": True, "files_processed": len(schema_files)}


def deploy_rpc_functions(
    supabase_url: str,
    service_key: str,
    dry_run: bool = False,
    config: Dict = None
) -> Dict[str, Any]:
    """
    Deploy only the schema introspection RPC functions.
    
    This is useful for enabling schema validation before deploying all schemas.
    """
    log_step("Deploying schema introspection RPC functions...")
    
    rpc_file = CORE_MODULES_DIR / "module-mgmt" / "db" / "schema" / RPC_FUNCTIONS_FILE
    
    if not rpc_file.exists():
        log_error(f"RPC functions file not found: {rpc_file}")
        return {"success": False, "error": "RPC file not found"}
    
    sql = read_sql_file(rpc_file)
    
    if dry_run:
        log_info(f"[DRY RUN] Would execute RPC functions SQL:\n{sql[:500]}...")
        return {"success": True, "dry_run": True}
    
    result = execute_sql_direct(supabase_url, service_key, sql, dry_run, config)
    
    if result.get("success"):
        log_success("RPC functions deployed successfully")
    elif result.get("manual_required"):
        output_file = "rpc-functions-deployment.sql"
        with open(output_file, 'w') as f:
            f.write(sql)
        log_info(f"SQL saved to: {output_file}")
    
    return result


def deploy_all_schemas(
    supabase_url: str,
    service_key: str,
    dry_run: bool = False,
    modules: Optional[List[str]] = None,
    config: Dict = None
) -> Dict[str, Any]:
    """Deploy schemas for all core modules in dependency order."""
    
    target_modules = modules if modules else MODULE_ORDER
    results = {}
    
    for module in MODULE_ORDER:
        if module in target_modules:
            results[module] = deploy_module_schema(
                module, supabase_url, service_key, dry_run, config
            )
    
    return results


# =============================================================================
# Validation
# =============================================================================

def validate_tables_exist(
    supabase_url: str,
    service_key: str,
    module: str
) -> Dict[str, Any]:
    """Validate that expected tables exist for a module."""
    
    log_step(f"Validating tables for {module}...")
    
    # Expected tables per module
    expected_tables = {
        "module-access": ["organizations", "profiles", "organization_memberships"],
        "module-ai": ["ai_providers", "ai_models", "ai_model_validation_history", "ai_model_validation_progress"],
        "module-mgmt": ["platform_lambda_config", "platform_module_registry", "platform_module_usage", "platform_module_usage_daily"],
    }
    
    tables = expected_tables.get(module, [])
    results = {"module": module, "tables": {}}
    
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    
    for table in tables:
        try:
            response = requests.get(
                f"{supabase_url}/rest/v1/{table}?select=*&limit=0",
                headers=headers,
                timeout=10
            )
            
            exists = response.status_code == 200
            results["tables"][table] = {
                "exists": exists,
                "status_code": response.status_code
            }
            
            status = "✅" if exists else "❌"
            log_info(f"  {status} {table}")
            
        except requests.exceptions.RequestException as e:
            results["tables"][table] = {"exists": False, "error": str(e)}
            log_error(f"  ❌ {table} - {e}")
    
    all_exist = all(t.get("exists", False) for t in results["tables"].values())
    results["success"] = all_exist
    
    return results


def run_validation(
    supabase_url: str,
    service_key: str,
    modules: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Run validation for all modules."""
    
    target_modules = modules if modules else MODULE_ORDER
    results = {}
    
    for module in target_modules:
        results[module] = validate_tables_exist(supabase_url, service_key, module)
    
    return results


# =============================================================================
# Main CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="CORA Database Setup - Deploy schemas and validate setup",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--config", "-c",
        help="Path to setup.config.yaml file",
        default="setup.config.yaml"
    )
    
    parser.add_argument(
        "--module", "-m",
        help="Deploy only a specific module (access, ai, mgmt)",
        choices=["access", "ai", "mgmt"],
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be executed without making changes"
    )
    
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only run validation, don't deploy schemas"
    )
    
    parser.add_argument(
        "--generate-sql",
        action="store_true",
        help="Generate combined SQL file for manual deployment"
    )
    
    parser.add_argument(
        "--deploy-rpc",
        action="store_true",
        help="Deploy only the schema introspection RPC functions"
    )
    
    args = parser.parse_args()
    
    # Banner
    print("=" * 60)
    print("  CORA Database Setup")
    print("=" * 60)
    print()
    
    # Load configuration
    config = None
    config_path = Path(args.config)
    
    if config_path.exists():
        log_info(f"Loading configuration from: {args.config}")
        config = load_config(args.config)
    else:
        log_warn(f"Config file not found: {args.config}")
        log_info("Using environment variables for credentials")
    
    # Get credentials
    supabase_url, service_key = get_supabase_credentials(config)
    log_info(f"Supabase URL: {supabase_url}")
    log_info(f"Service Key: {'*' * 20}...{service_key[-4:]}")
    print()
    
    # Determine target modules
    target_modules = None
    if args.module:
        target_modules = [f"module-{args.module}"]
        log_info(f"Target module: {target_modules[0]}")
    else:
        log_info(f"Target modules: {', '.join(MODULE_ORDER)}")
    print()
    
    # Deploy RPC functions only
    if args.deploy_rpc:
        log_step("Deploying RPC functions only...")
        result = deploy_rpc_functions(supabase_url, service_key, args.dry_run, config)
        
        if result.get("success"):
            log_success("RPC functions deployed successfully!")
        elif result.get("manual_required"):
            log_warn("Manual SQL execution required. See generated file.")
        else:
            log_error(f"RPC deployment failed: {result.get('error')}")
            sys.exit(1)
        return
    
    # Generate SQL only
    if args.generate_sql:
        log_step("Generating combined SQL file...")
        all_sql = []
        
        for module in (target_modules or MODULE_ORDER):
            schema_files = get_schema_files(module)
            for file_path in schema_files:
                sql = read_sql_file(file_path)
                all_sql.append(f"-- ==========================================")
                all_sql.append(f"-- Module: {module}")
                all_sql.append(f"-- File: {file_path.name}")
                all_sql.append(f"-- ==========================================\n")
                all_sql.append(sql)
        
        output_file = "cora-schema-deployment.sql"
        with open(output_file, 'w') as f:
            f.write("\n\n".join(all_sql))
        
        log_success(f"SQL saved to: {output_file}")
        log_info("Run this file in the Supabase Dashboard SQL Editor")
        return
    
    # Validation only
    if args.validate_only:
        log_step("Running validation...")
        results = run_validation(supabase_url, service_key, target_modules)
        
        print()
        all_success = all(r.get("success", False) for r in results.values())
        
        if all_success:
            log_success("All validations passed!")
        else:
            log_error("Some validations failed. See above for details.")
            sys.exit(1)
        return
    
    # Deploy schemas
    if args.dry_run:
        log_warn("DRY RUN - No changes will be made")
        print()
    
    log_step("Deploying database schemas...")
    deploy_results = deploy_all_schemas(
        supabase_url, service_key, 
        dry_run=args.dry_run,
        modules=target_modules,
        config=config
    )
    
    print()
    
    # Run validation after deployment
    if not args.dry_run:
        log_step("Running post-deployment validation...")
        validation_results = run_validation(supabase_url, service_key, target_modules)
        
        print()
        all_success = all(r.get("success", False) for r in validation_results.values())
        
        if all_success:
            log_success("Database setup complete! All validations passed.")
        else:
            log_warn("Some tables may not have been created.")
            log_info("If manual SQL execution is required, run the generated SQL file.")
    else:
        log_info("[DRY RUN] Skipping validation")
    
    print()
    print("=" * 60)
    print("  Setup Complete")
    print("=" * 60)


if __name__ == "__main__":
    main()
