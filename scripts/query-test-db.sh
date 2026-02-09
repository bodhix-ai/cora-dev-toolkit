#!/bin/bash
# =============================================================================
# query-test-db.sh - Query a CORA test project's Supabase database
# =============================================================================
#
# Usage:
#   ./scripts/query-test-db.sh <stack-path> "<sql-query>"
#   ./scripts/query-test-db.sh <stack-path> -f <sql-file>
#
# Examples:
#   ./scripts/query-test-db.sh ~/code/bodhix/testing/eval-studio/ai-mod-stack \
#     "SELECT prompt_type, LEFT(system_prompt, 100) FROM eval_cfg_sys_prompts;"
#
#   ./scripts/query-test-db.sh ~/code/bodhix/testing/eval-studio/ai-mod-stack \
#     -f templates/_modules-functional/module-eval/db/migrations/20260209_custom_response_fields.sql
#
# The .env file is always at: <stack-path>/scripts/validation/.env
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <stack-path> \"<sql-query>\""
    echo "       $0 <stack-path> -f <sql-file>"
    echo ""
    echo "Arguments:"
    echo "  <stack-path>   Path to the test project's stack repo"
    echo "                 e.g., ~/code/bodhix/testing/eval-studio/ai-mod-stack"
    echo "  <sql-query>    SQL query string to execute"
    echo "  -f <sql-file>  SQL file to execute"
    echo ""
    echo "The script reads database credentials from:"
    echo "  <stack-path>/scripts/validation/.env"
    echo ""
    echo "Examples:"
    echo "  $0 ~/code/bodhix/testing/eval-studio/ai-mod-stack \"SELECT COUNT(*) FROM eval_cfg_sys_prompts;\""
    echo "  $0 ~/code/bodhix/testing/eval-studio/ai-mod-stack -f migrations/fix.sql"
    exit 1
}

# Validate arguments
if [ $# -lt 2 ]; then
    usage
fi

STACK_PATH="$1"
shift

# Resolve ~ in path
STACK_PATH="${STACK_PATH/#\~/$HOME}"

# Consistent internal path to .env
ENV_FILE="${STACK_PATH}/scripts/validation/.env"

# Check .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: .env file not found at: ${ENV_FILE}${NC}"
    echo ""
    echo "Expected location: <stack-path>/scripts/validation/.env"
    echo "Provided stack path: ${STACK_PATH}"
    echo ""
    echo "Ensure the test project has been set up with validation scripts."
    exit 1
fi

# Parse .env file for database credentials
# Handle quoted values and special characters
get_env_value() {
    local key="$1"
    local value
    value=$(grep "^${key}=" "$ENV_FILE" | head -1 | sed "s/^${key}=//" | sed 's/^"//' | sed 's/"$//')
    echo "$value"
}

DB_HOST=$(get_env_value "SUPABASE_DB_HOST")
DB_PORT=$(get_env_value "SUPABASE_DB_PORT")
DB_NAME=$(get_env_value "SUPABASE_DB_NAME")
DB_USER=$(get_env_value "SUPABASE_DB_USER")
DB_PASSWORD=$(get_env_value "SUPABASE_DB_PASSWORD")

# Validate we got all required values
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}ERROR: Missing database credentials in ${ENV_FILE}${NC}"
    echo "Required keys: SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD"
    exit 1
fi

# Default port and database if not specified
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"

# Display connection info (without password)
echo -e "${GREEN}Connecting to:${NC} ${DB_HOST}:${DB_PORT}/${DB_NAME} as ${DB_USER}"
echo ""

# Execute query or file
if [ "$1" = "-f" ]; then
    # File mode
    if [ $# -lt 2 ]; then
        echo -e "${RED}ERROR: -f requires a SQL file path${NC}"
        usage
    fi
    SQL_FILE="$2"
    if [ ! -f "$SQL_FILE" ]; then
        echo -e "${RED}ERROR: SQL file not found: ${SQL_FILE}${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Executing file:${NC} ${SQL_FILE}"
    echo "---"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$SQL_FILE"
else
    # Query mode
    SQL_QUERY="$1"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "$SQL_QUERY"
fi