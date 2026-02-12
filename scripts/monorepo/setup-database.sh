#!/bin/bash

# setup-database.sh
# Consolidates database schemas and provisions database for CORA monorepo
# Part of the CORA monorepo creation toolkit

set -e

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
  cat << EOF
Setup Database

Consolidates database schemas from CORA modules and optionally provisions the database.

Usage: $0 --target TARGET [OPTIONS]

Arguments:
  --target TARGET     Path to target project directory
  --provision         Run database migrations after consolidation
  --help             Show this help message

Options:
  --provision         Execute consolidated SQL against Supabase database
                      (Requires .env file with database credentials)

Examples:
  # Consolidate schemas only
  $0 --target /path/to/project

  # Consolidate and provision database
  $0 --target /path/to/project --provision

Generated Files:
  - scripts/setup-database.sql    (Consolidated SQL from all modules)
EOF
}

# --- Parse Arguments ---
TARGET_DIR=""
PROVISION=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --target)
      TARGET_DIR="$2"
      shift 2
      ;;
    --provision)
      PROVISION=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# --- Validate Arguments ---
if [[ -z "$TARGET_DIR" ]]; then
  log_error "Target directory is required (--target)"
  show_help
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  log_error "Target directory not found: $TARGET_DIR"
  exit 1
fi

# --- Consolidate Database Schemas ---
log_info "Consolidating database schemas..."

if [[ ! -d "${TARGET_DIR}/packages" ]]; then
  log_warn "Packages directory not found"
  exit 0
fi

# Define module tiers (boot order)
tier1_modules=("module-access")
tier2_modules=("module-ai" "module-ws")
tier3_modules=("module-chat" "module-kb" "module-mgmt")
functional_modules=("module-eval" "module-voice" "module-eval-studio")

schema_files=()

# Function to collect schema files from a module
add_module_schemas() {
  local module_name="$1"
  local module_dir="${TARGET_DIR}/packages/${module_name}/db/schema"
  
  if [[ -d "$module_dir" ]]; then
    while IFS= read -r schema_file; do
      [[ -n "$schema_file" ]] && schema_files+=("$schema_file")
    done < <(find "$module_dir" -name "*.sql" -not -path "*/archive/*" -type f 2>/dev/null | sort)
  fi
}

# Collect schemas in tier order
for module in "${tier1_modules[@]}" "${tier2_modules[@]}" "${tier3_modules[@]}" "${functional_modules[@]}"; do
  add_module_schemas "$module"
done

if [[ ${#schema_files[@]} -eq 0 ]]; then
  log_warn "No database schema files found"
  exit 0
fi

# Create consolidated SQL file
mkdir -p "${TARGET_DIR}/scripts"
cat > "${TARGET_DIR}/scripts/setup-database.sql" << 'SQLHEADER'
-- CORA Database Setup Script
-- Consolidated from all modules
-- Idempotent and safe to run multiple times

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SQLHEADER

# Append each schema file
for schema_file in "${schema_files[@]}"; do
  module_name=$(basename "$(dirname "$(dirname "$(dirname "$schema_file")")")")
  echo "" >> "${TARGET_DIR}/scripts/setup-database.sql"
  echo "-- Module: ${module_name}" >> "${TARGET_DIR}/scripts/setup-database.sql"
  cat "$schema_file" >> "${TARGET_DIR}/scripts/setup-database.sql"
  log_info "  Added ${module_name}/$(basename "$schema_file")"
done

log_info "✅ Created scripts/setup-database.sql"

# --- Provision Database (Optional) ---
if [[ "$PROVISION" == "true" ]]; then
  log_info "Provisioning database..."
  
  # Check if database credentials are available
  if [[ ! -f "${TARGET_DIR}/scripts/validation/.env" ]]; then
    log_warn "Database credentials not found at ${TARGET_DIR}/scripts/validation/.env"
    log_info "Skipping automatic provisioning. Run migrations manually."
    exit 0
  fi
  
  # Load database credentials
  source "${TARGET_DIR}/scripts/validation/.env"
  
  # Verify required credentials
  if [[ -z "$SUPABASE_DB_HOST" ]] || [[ -z "$SUPABASE_DB_USER" ]] || [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
    log_warn "Database credentials incomplete. Required: SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD"
    log_info "Skipping automatic provisioning."
    exit 0
  fi
  
  # Check if psql is available
  if ! command -v psql &> /dev/null; then
    log_warn "psql not found. Install PostgreSQL client to enable automatic provisioning."
    log_info "On macOS: brew install postgresql"
    log_info "Skipping automatic provisioning."
    exit 0
  fi
  
  # URL-encode password for connection string
  url_encode_password() {
    python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=''))" "$1"
  }
  
  # Build connection string
  encoded_password=$(url_encode_password "$SUPABASE_DB_PASSWORD")
  conn_string="postgresql://${SUPABASE_DB_USER}:${encoded_password}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT:-6543}/${SUPABASE_DB_NAME:-postgres}"
  
  # Execute SQL
  if [[ -f "${TARGET_DIR}/scripts/setup-database.sql" ]]; then
    log_info "Executing setup-database.sql..."
    echo ""
    
    psql_output=$(mktemp)
    psql_errors=$(mktemp)
    
    psql "$conn_string" -f "${TARGET_DIR}/scripts/setup-database.sql" \
         --echo-errors \
         > "$psql_output" 2> "$psql_errors"
    psql_exit_code=$?
    
    # Check for errors
    has_errors=false
    if grep -q "^ERROR:" "$psql_errors" 2>/dev/null; then
      has_errors=true
    fi
    
    if [[ $psql_exit_code -eq 0 ]] || ! $has_errors; then
      log_info "Schema creation completed. Summary:"
      echo ""
      
      # Count created objects
      tables_created=$(grep -c "CREATE TABLE" "$psql_output" 2>/dev/null || echo "0")
      indexes_created=$(grep -c "CREATE INDEX" "$psql_output" 2>/dev/null || echo "0")
      functions_created=$(grep -c "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" "$psql_output" 2>/dev/null || echo "0")
      policies_created=$(grep -c "CREATE POLICY" "$psql_output" 2>/dev/null || echo "0")
      inserts_done=$(grep -c "INSERT INTO" "$psql_output" 2>/dev/null || echo "0")
      
      echo "  📊 Objects Created:"
      echo "     - Tables: $tables_created"
      echo "     - Indexes: $indexes_created"
      echo "     - Functions: $functions_created"
      echo "     - Policies: $policies_created"
      echo "     - Data Inserts: $inserts_done"
      echo ""
      
      # Check for warnings
      if grep -q "NOTICE\|WARNING" "$psql_output" 2>/dev/null; then
        log_warn "Notices/Warnings detected:"
        grep "NOTICE\|WARNING" "$psql_output" | sed 's/^/     /'
        echo ""
      fi
      
      log_info "✅ Database schema created successfully"
      
    else
      log_error "❌ Failed to execute setup-database.sql"
      echo ""
      log_error "PostgreSQL Errors:"
      cat "$psql_errors" | sed 's/^/     /'
      echo ""
      
      if grep -q "does not exist" "$psql_errors"; then
        log_warn "💡 Possible causes:"
        echo "     - Table referenced in policy/constraint doesn't exist yet"
        echo "     - Schema files may be in wrong order"
        echo "     - Check for typos in table names"
        echo ""
      fi
      
      log_warn "Run migrations manually:"
      echo "  psql \"${conn_string}\" -f ${TARGET_DIR}/scripts/setup-database.sql"
      
      rm -f "$psql_output" "$psql_errors"
      exit 1
    fi
    
    rm -f "$psql_output" "$psql_errors"
  fi
  
  echo ""
  log_info "🎉 Database provisioning completed successfully!"
fi

echo ""
log_info "Database setup complete"
exit 0