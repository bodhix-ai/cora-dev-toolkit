#!/bin/bash

#==============================================================================
# CORA Project Provisioning - Pre-Flight Check Script
#==============================================================================
# Purpose: Validate environment before starting project creation workflow
# Usage: ./scripts/pre-flight-check.sh [--config CONFIG_FILE] [--fix]
#
# Part of: Phase 2 Workflow Optimization (plan_cora-workflow-optimization.md)
# Created: January 16, 2026
#==============================================================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Exit codes
EXIT_SUCCESS=0
EXIT_BLOCKING=1
EXIT_WARNING=2

# Counters
CHECKS_PASSED=0
CHECKS_WARNED=0
CHECKS_FAILED=0

# Configuration
CONFIG_FILE=""
AUTO_FIX=false
VERBOSE=false

#==============================================================================
# Helper Functions
#==============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_section() {
    echo -e "\n${BLUE}--- $1 ---${NC}"
}

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    CHECKS_WARNED=$((CHECKS_WARNED + 1))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

print_summary() {
    echo ""
    print_header "Pre-Flight Check Summary"
    echo -e "Passed:  ${GREEN}${CHECKS_PASSED}${NC}"
    echo -e "Warnings: ${YELLOW}${CHECKS_WARNED}${NC}"
    echo -e "Failed:  ${RED}${CHECKS_FAILED}${NC}"
    echo ""
    
    if [ $CHECKS_FAILED -gt 0 ]; then
        echo -e "${RED}[BLOCKING]${NC} Cannot proceed - fix errors above"
        return $EXIT_BLOCKING
    elif [ $CHECKS_WARNED -gt 0 ]; then
        echo -e "${YELLOW}[WARNING]${NC} Proceed with caution - review warnings above"
        return $EXIT_WARNING
    else
        echo -e "${GREEN}[SUCCESS]${NC} All checks passed - ready to proceed"
        return $EXIT_SUCCESS
    fi
}

#==============================================================================
# Version Checks
#==============================================================================

check_node_version() {
    print_section "Node.js"
    echo "  Checking Node.js installation..." >&2
    
    if ! command -v node &> /dev/null; then
        check_fail "Node.js not found"
        echo "  → Install Node.js 18+ from https://nodejs.org/"
        return
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local major_version=$(echo "$node_version" | cut -d. -f1)
    
    if [ "$major_version" -ge 18 ]; then
        check_pass "Node.js $node_version (>= 18 required)"
    else
        check_fail "Node.js $node_version (< 18, upgrade required)"
        echo "  → Install Node.js 18+ from https://nodejs.org/"
    fi
}

check_pnpm() {
    print_section "pnpm"
    echo "  Checking pnpm installation..." >&2
    
    if ! command -v pnpm &> /dev/null; then
        check_fail "pnpm not found"
        echo "  → Install: npm install -g pnpm"
        if [ "$AUTO_FIX" = true ]; then
            echo "  → Auto-fix: npm install -g pnpm" >&2
            npm install -g pnpm
        fi
        return
    fi
    
    local pnpm_version=$(pnpm --version)
    check_pass "pnpm $pnpm_version installed"
}

check_python() {
    print_section "Python"
    echo "  Checking Python installation..." >&2
    
    if ! command -v python3 &> /dev/null; then
        check_fail "Python 3 not found"
        echo "  → Install Python 3.11+ from https://python.org/"
        return
    fi
    
    local python_version=$(python3 --version | awk '{print $2}')
    local major_version=$(echo "$python_version" | cut -d. -f1)
    local minor_version=$(echo "$python_version" | cut -d. -f2)
    
    if [ "$major_version" -eq 3 ] && [ "$minor_version" -ge 9 ]; then
        check_pass "Python $python_version (>= 3.9 required for build tools)"
        if [ "$minor_version" -lt 11 ]; then
            check_warn "Python $python_version detected (Lambda runtime uses 3.11)"
            echo "  → Consider upgrading to 3.11+ to match Lambda runtime"
        fi
    else
        check_fail "Python $python_version (< 3.9, upgrade required)"
        echo "  → Install Python 3.9+ from https://python.org/"
    fi
    
    # Check pip3
    echo "  Checking pip3..." >&2
    if ! command -v pip3 &> /dev/null; then
        check_warn "pip3 not found (needed for Lambda builds)"
        echo "  → Usually bundled with Python installation"
    else
        check_pass "pip3 available"
    fi
    
    # Check PyYAML module
    echo "  Checking PyYAML module..." >&2
    if python3 -c "import yaml" 2>/dev/null; then
        check_pass "PyYAML module installed"
    else
        check_fail "PyYAML module not found (required for config parsing)"
        echo "  → Install: pip3 install pyyaml"
        if [ "$AUTO_FIX" = true ]; then
            echo "  → Auto-fix: pip3 install pyyaml" >&2
            pip3 install pyyaml
        fi
    fi
}

check_terraform() {
    print_section "Terraform"
    
    if ! command -v terraform &> /dev/null; then
        check_fail "Terraform not found"
        echo "  → Install Terraform 1.5+ from https://terraform.io/"
        return
    fi
    
    local tf_version=$(terraform --version | head -n1 | awk '{print $2}' | sed 's/v//')
    local major_version=$(echo "$tf_version" | cut -d. -f1)
    local minor_version=$(echo "$tf_version" | cut -d. -f2)
    
    if [ "$major_version" -ge 1 ] && [ "$minor_version" -ge 5 ]; then
        check_pass "Terraform $tf_version (>= 1.5 required)"
    else
        check_warn "Terraform $tf_version (< 1.5, may have compatibility issues)"
    fi
}

check_aws_cli() {
    print_section "AWS CLI"
    
    if ! command -v aws &> /dev/null; then
        check_fail "AWS CLI not found"
        echo "  → Install from https://aws.amazon.com/cli/"
        return
    fi
    
    local aws_version=$(aws --version 2>&1 | awk '{print $1}' | cut -d/ -f2)
    check_pass "AWS CLI $aws_version installed"
}

check_psql() {
    print_section "PostgreSQL Client (psql)"
    
    if ! command -v psql &> /dev/null; then
        check_warn "psql not found (optional for database debugging)"
        echo "  → Install PostgreSQL client tools if needed"
    else
        local psql_version=$(psql --version | awk '{print $3}')
        check_pass "psql $psql_version installed"
    fi
}

#==============================================================================
# Configuration Checks
#==============================================================================

check_config_file() {
    print_section "Configuration File"
    
    if [ -z "$CONFIG_FILE" ]; then
        check_warn "No config file specified (use --config flag)"
        echo "  → Skipping configuration validation"
        return
    fi
    
    if [ ! -f "$CONFIG_FILE" ]; then
        check_fail "Config file not found: $CONFIG_FILE"
        return
    fi
    
    check_pass "Config file exists: $CONFIG_FILE"
    
    # Check if valid YAML (basic check)
    if command -v python3 &> /dev/null; then
        if python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
            check_pass "Config file is valid YAML"
        else
            check_fail "Config file is not valid YAML"
            return
        fi
    else
        check_warn "Cannot validate YAML (python3 not available)"
    fi
    
    # Check required fields
    if command -v python3 &> /dev/null; then
        local missing_fields=$(python3 -c "
import yaml
with open('$CONFIG_FILE') as f:
    config = yaml.safe_load(f)
    required = ['project', 'aws', 'supabase']
    missing = [field for field in required if field not in config]
    print(','.join(missing))
" 2>/dev/null)
        
        if [ -z "$missing_fields" ]; then
            check_pass "Required config fields present"
        else
            check_fail "Missing required fields: $missing_fields"
        fi
    fi
}

#==============================================================================
# AWS Checks
#==============================================================================

check_aws_credentials() {
    print_section "AWS Credentials"
    
    if [ ! -f ~/.aws/credentials ]; then
        check_fail "AWS credentials file not found: ~/.aws/credentials"
        echo "  → Run: aws configure"
        return
    fi
    
    check_pass "AWS credentials file exists"
    
    # Extract AWS profile from config if available
    local aws_profile="default"
    if [ -n "$CONFIG_FILE" ] && command -v python3 &> /dev/null; then
        aws_profile=$(python3 -c "
import yaml
try:
    with open('$CONFIG_FILE') as f:
        config = yaml.safe_load(f)
        print(config.get('aws', {}).get('profile', 'default'))
except:
    print('default')
" 2>/dev/null)
    fi
    
    # Test AWS access
    if AWS_PROFILE="$aws_profile" aws sts get-caller-identity &> /dev/null; then
        local account_id=$(AWS_PROFILE="$aws_profile" aws sts get-caller-identity --query Account --output text 2>/dev/null)
        check_pass "AWS profile '$aws_profile' is valid (Account: $account_id)"
    else
        check_fail "Cannot access AWS with profile '$aws_profile'"
        echo "  → Check credentials and profile name"
    fi
}

#==============================================================================
# Supabase Checks
#==============================================================================

check_supabase_connection() {
    print_section "Supabase Connection"
    
    if [ -z "$CONFIG_FILE" ]; then
        check_warn "No config file - skipping Supabase check"
        return
    fi
    
    if ! command -v python3 &> /dev/null; then
        check_warn "Cannot check Supabase (python3 not available)"
        return
    fi
    
    # Extract connection string
    local db_url=$(python3 -c "
import yaml
try:
    with open('$CONFIG_FILE') as f:
        config = yaml.safe_load(f)
        print(config.get('supabase', {}).get('db_connection_string', ''))
except:
    print('')
" 2>/dev/null)
    
    if [ -z "$db_url" ]; then
        check_warn "No Supabase connection string in config"
        return
    fi
    
    check_pass "Supabase connection string found in config"
    
    # Test connection if psql available
    if command -v psql &> /dev/null; then
        if timeout 5 psql "$db_url" -c "SELECT 1" &> /dev/null; then
            check_pass "Supabase database is reachable"
        else
            check_fail "Cannot connect to Supabase database"
            echo "  → Verify connection string and network access"
        fi
    else
        check_warn "Cannot test Supabase connection (psql not available)"
    fi
}

#==============================================================================
# Project Directory Checks
#==============================================================================

check_project_directory() {
    print_section "Project Directory"
    
    if [ -z "$CONFIG_FILE" ]; then
        check_warn "No config file - skipping project directory check"
        return
    fi
    
    # Extract project name and calculate target path
    local project_name=$(python3 -c "
import yaml
try:
    with open('$CONFIG_FILE') as f:
        config = yaml.safe_load(f)
        print(config.get('project', {}).get('name', ''))
except:
    print('')
" 2>/dev/null)
    
    if [ -z "$project_name" ]; then
        check_warn "Cannot determine project name from config"
        return
    fi
    
    # Check if project directories already exist
    local stack_dir="$HOME/code/bodhix/testing/test-ws-*/ai-sec-stack"
    local infra_dir="$HOME/code/bodhix/testing/test-ws-*/ai-sec-infra"
    
    # This is a simplified check - full-lifecycle.sh will have more detailed logic
    check_pass "Project name: $project_name"
}

#==============================================================================
# Toolkit Checks
#==============================================================================

check_toolkit_location() {
    print_section "CORA Toolkit"
    echo "  Checking toolkit installation..." >&2
    
    local toolkit_root="/Users/aaron/code/bodhix/cora-dev-toolkit"
    
    if [ ! -d "$toolkit_root" ]; then
        check_fail "CORA toolkit not found at: $toolkit_root"
        return
    fi
    
    check_pass "CORA toolkit location: $toolkit_root"
    
    # Check critical scripts exist
    echo "  Verifying required scripts..." >&2
    local required_scripts=(
        "scripts/create-cora-project.sh"
        "scripts/build-cora-modules.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ ! -f "$toolkit_root/$script" ]; then
            check_fail "Required script missing: $script"
        else
            check_pass "Script exists: $script"
        fi
    done
    echo "  Toolkit checks complete" >&2
}

#==============================================================================
# Main Execution
#==============================================================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Pre-flight check for CORA project provisioning workflow.

Options:
  --config FILE     Path to setup config YAML file
  --fix             Attempt to auto-fix issues where possible
  --verbose         Show detailed output
  --help            Show this help message

Examples:
  # Basic check
  $0

  # Check with specific config
  $0 --config setup.config.test-ws-26.yaml

  # Check and auto-fix issues
  $0 --config setup.config.test-ws-26.yaml --fix

Exit Codes:
  0  All checks passed
  1  Blocking issues found (cannot proceed)
  2  Warnings found (can proceed with caution)

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --fix)
                AUTO_FIX=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

main() {
    parse_arguments "$@"
    
    print_header "CORA Project Provisioning - Pre-Flight Check"
    
    echo "Config file: ${CONFIG_FILE:-<not specified>}" >&2
    echo "Auto-fix: $AUTO_FIX" >&2
    echo "" >&2
    
    echo "[INFO] Starting environment validation..." >&2
    echo "" >&2
    
    # Run all checks with progress indicators
    echo "[1/11] Checking CORA toolkit..." >&2
    check_toolkit_location
    
    echo "" >&2
    echo "[2/11] Checking Node.js..." >&2
    check_node_version
    
    echo "" >&2
    echo "[3/11] Checking pnpm..." >&2
    check_pnpm
    
    echo "" >&2
    echo "[4/11] Checking Python..." >&2
    check_python
    
    echo "" >&2
    echo "[5/11] Checking Terraform..." >&2
    check_terraform
    
    echo "" >&2
    echo "[6/11] Checking AWS CLI..." >&2
    check_aws_cli
    
    echo "" >&2
    echo "[7/11] Checking PostgreSQL client..." >&2
    check_psql
    
    echo "" >&2
    echo "[8/11] Validating configuration file..." >&2
    check_config_file
    
    echo "" >&2
    echo "[9/11] Checking AWS credentials..." >&2
    check_aws_credentials
    
    echo "" >&2
    echo "[10/11] Checking Supabase connection..." >&2
    check_supabase_connection
    
    echo "" >&2
    echo "[11/11] Checking project directory..." >&2
    check_project_directory
    
    echo "" >&2
    echo "[INFO] All checks complete" >&2
    echo "" >&2
    
    # Print summary and exit with appropriate code
    print_summary
    exit $?
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
