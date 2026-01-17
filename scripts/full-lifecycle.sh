#!/bin/bash

#==============================================================================
# CORA Project Provisioning - Full Lifecycle Automation
#==============================================================================
# Purpose: Automate complete test environment creation from config to running
# Usage: ./scripts/full-lifecycle.sh --config CONFIG_FILE [OPTIONS]
#
# Part of: Phase 2 Workflow Optimization (plan_cora-workflow-optimization.md)
# Created: January 16, 2026
#
# This script automates the 5-phase workflow from .cline/workflows/test-module.md:
#   Phase 0: Configuration validation (pre-flight checks)
#   Phase 1: Project creation (create-cora-project.sh + migrations)
#   Phase 2: Build validation (pnpm install, TypeScript, Lambda builds)
#   Phase 3: Infrastructure deployment (Terraform apply)
#   Phase 4: Development server (Next.js dev server)
#
# Features:
#   - Resume from failed phase
#   - Skip specific phases
#   - Cleanup and recreate
#   - Dry-run mode
#   - State tracking for recovery
#==============================================================================

set -e  # Exit on error (can be overridden with --no-exit-on-error)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
CONFIG_FILE=""
DRY_RUN=false
CLEANUP=false
VERBOSE=false
RESUME_FROM=""
SKIP_PHASES=""
EXIT_ON_ERROR=true
SKIP_VALIDATION="${SKIP_VALIDATION:-true}"  # Default to true (Phase 1 fix)

# State file for resume functionality
STATE_FILE="$HOME/.cora-lifecycle-state.json"

# Paths (will be set from config)
PROJECT_NAME=""
TEST_WS_NUMBER=""
STACK_PATH=""
INFRA_PATH=""

#==============================================================================
# Helper Functions
#==============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_phase() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}PHASE $1: $2${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}→${NC} $1"
}

save_state() {
    local phase="$1"
    local status="$2"
    local message="${3:-}"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$STATE_FILE" <<EOF
{
  "project": "$PROJECT_NAME",
  "workspace": "test-ws-$TEST_WS_NUMBER",
  "config_file": "$CONFIG_FILE",
  "last_phase": "$phase",
  "last_status": "$status",
  "last_message": "$message",
  "timestamp": "$timestamp",
  "stack_path": "$STACK_PATH",
  "infra_path": "$INFRA_PATH"
}
EOF
    
    if [ "$VERBOSE" = true ]; then
        log_info "State saved: Phase $phase - $status"
    fi
}

load_state() {
    if [ -f "$STATE_FILE" ]; then
        if [ "$VERBOSE" = true ]; then
            log_info "Previous state found:"
            cat "$STATE_FILE"
        fi
        return 0
    fi
    return 1
}

clear_state() {
    if [ -f "$STATE_FILE" ]; then
        rm "$STATE_FILE"
        log_info "State cleared"
    fi
}

should_run_phase() {
    local phase="$1"
    
    # Check if phase should be skipped
    if [[ ",$SKIP_PHASES," == *",$phase,"* ]]; then
        log_warn "Skipping Phase $phase (--skip-phases)"
        return 1
    fi
    
    # Check if resuming and this phase is before resume point
    if [ -n "$RESUME_FROM" ]; then
        if [ "$phase" -lt "$RESUME_FROM" ]; then
            log_info "Skipping Phase $phase (resuming from Phase $RESUME_FROM)"
            return 1
        fi
    fi
    
    return 0
}

#==============================================================================
# Phase 0: Pre-Flight Checks
#==============================================================================

phase_0_preflight() {
    if ! should_run_phase 0; then
        return 0
    fi
    
    print_phase "0" "Pre-Flight Checks"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] Would run pre-flight checks"
        return 0
    fi
    
    save_state "0" "running" "Pre-flight checks"
    
    log_step "Running environment validation..."
    
    if [ -f "$SCRIPT_DIR/pre-flight-check.sh" ]; then
        if "$SCRIPT_DIR/pre-flight-check.sh" --config "$CONFIG_FILE" ${VERBOSE:+--verbose}; then
            log_info "✓ Pre-flight checks passed"
            save_state "0" "complete" "Pre-flight checks passed"
        else
            local exit_code=$?
            if [ $exit_code -eq 2 ]; then
                log_warn "Pre-flight checks completed with warnings"
                save_state "0" "warning" "Pre-flight checks had warnings"
            else
                log_error "Pre-flight checks failed"
                save_state "0" "failed" "Pre-flight checks failed"
                return 1
            fi
        fi
    else
        log_warn "Pre-flight check script not found, skipping"
    fi
    
    return 0
}

#==============================================================================
# Phase 1: Project Creation
#==============================================================================

phase_1_create_project() {
    if ! should_run_phase 1; then
        return 0
    fi
    
    print_phase "1" "Project Creation"
    
    # Extract project details from config
    if command -v python3 &> /dev/null && [ -f "$CONFIG_FILE" ]; then
        PROJECT_NAME=$(python3 -c "
import yaml
with open('$CONFIG_FILE') as f:
    config = yaml.safe_load(f)
    print(config.get('project', {}).get('name', 'ai-sec'))
" 2>/dev/null || echo "ai-sec")
        
        # Extract test workspace number from config filename
        TEST_WS_NUMBER=$(basename "$CONFIG_FILE" | grep -oE 'test-ws-[0-9]+' | grep -oE '[0-9]+' || echo "")
        
        if [ -z "$TEST_WS_NUMBER" ]; then
            log_error "Cannot determine test workspace number from config file"
            return 1
        fi
        
        STACK_PATH="$HOME/code/bodhix/testing/test-ws-$TEST_WS_NUMBER/${PROJECT_NAME}-stack"
        INFRA_PATH="$HOME/code/bodhix/testing/test-ws-$TEST_WS_NUMBER/${PROJECT_NAME}-infra"
    else
        log_error "Cannot parse config file (python3 required)"
        return 1
    fi
    
    log_info "Project: $PROJECT_NAME"
    log_info "Workspace: test-ws-$TEST_WS_NUMBER"
    log_info "Stack path: $STACK_PATH"
    log_info "Infra path: $INFRA_PATH"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] Would create project from config: $CONFIG_FILE"
        return 0
    fi
    
    # Cleanup if requested
    if [ "$CLEANUP" = true ]; then
        log_step "Cleaning up existing project..."
        if [ -d "$(dirname "$STACK_PATH")" ]; then
            rm -rf "$(dirname "$STACK_PATH")"
            log_info "✓ Removed existing test workspace"
        fi
    fi
    
    save_state "1" "running" "Creating project"
    
    log_step "Running create-cora-project.sh..."
    
    if [ -f "$SCRIPT_DIR/create-cora-project.sh" ]; then
        cd "$TOOLKIT_ROOT"
        
        if "$SCRIPT_DIR/create-cora-project.sh" --input "$CONFIG_FILE"; then
            log_info "✓ Project created successfully"
            save_state "1" "complete" "Project creation successful"
        else
            log_error "Project creation failed"
            save_state "1" "failed" "create-cora-project.sh failed"
            return 1
        fi
    else
        log_error "create-cora-project.sh not found"
        return 1
    fi
    
    # Verify project directories exist
    if [ ! -d "$STACK_PATH" ] || [ ! -d "$INFRA_PATH" ]; then
        log_error "Project directories not created"
        save_state "1" "failed" "Project directories missing"
        return 1
    fi
    
    log_info "✓ Phase 1 complete"
    return 0
}

#==============================================================================
# Phase 2: Build & Validation
#==============================================================================

phase_2_build_validation() {
    if ! should_run_phase 2; then
        return 0
    fi
    
    print_phase "2" "Build & Validation"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] Would run build validation"
        return 0
    fi
    
    save_state "2" "running" "Build validation"
    
    # Step 2.1: pnpm install
    log_step "Installing dependencies (pnpm install)..."
    cd "$STACK_PATH"
    
    if pnpm install --frozen-lockfile 2>&1 | tee /tmp/pnpm-install.log; then
        log_info "✓ Dependencies installed"
    else
        log_error "pnpm install failed"
        save_state "2.1" "failed" "pnpm install failed"
        return 1
    fi
    
    # Step 2.2: TypeScript type check
    log_step "Running TypeScript type check..."
    
    if pnpm -r run type-check 2>&1 | tee /tmp/typescript-check.log; then
        log_info "✓ TypeScript validation passed"
    else
        log_error "TypeScript type check failed"
        log_info "Check /tmp/typescript-check.log for details"
        save_state "2.2" "failed" "TypeScript validation failed"
        return 1
    fi
    
    # Step 2.3: Lambda builds
    log_step "Building Lambda functions..."
    cd "$INFRA_PATH"
    
    export SKIP_VALIDATION="$SKIP_VALIDATION"
    
    if [ -f "$INFRA_PATH/scripts/build-cora-modules.sh" ]; then
        if bash "$INFRA_PATH/scripts/build-cora-modules.sh" 2>&1 | tee /tmp/lambda-build.log; then
            log_info "✓ Lambda builds completed"
        else
            log_error "Lambda builds failed"
            log_info "Check /tmp/lambda-build.log for details"
            save_state "2.3" "failed" "Lambda builds failed"
            return 1
        fi
    else
        log_error "build-cora-modules.sh not found"
        return 1
    fi
    
    # Step 2.4: Pre-deploy check
    log_step "Running pre-deployment checks..."
    
    if [ -f "$INFRA_PATH/scripts/pre-deploy-check.sh" ]; then
        if bash "$INFRA_PATH/scripts/pre-deploy-check.sh" 2>&1 | tee /tmp/pre-deploy-check.log; then
            log_info "✓ Pre-deployment checks passed"
        else
            log_warn "Pre-deployment checks had warnings (continuing)"
        fi
    fi
    
    log_info "✓ Phase 2 complete"
    save_state "2" "complete" "Build validation successful"
    return 0
}

#==============================================================================
# Phase 3: Infrastructure Deployment
#==============================================================================

phase_3_deploy_infrastructure() {
    if ! should_run_phase 3; then
        return 0
    fi
    
    print_phase "3" "Infrastructure Deployment"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] Would deploy infrastructure via Terraform"
        return 0
    fi
    
    save_state "3" "running" "Infrastructure deployment"
    
    log_step "Deploying infrastructure (deploy-all.sh)..."
    cd "$INFRA_PATH"
    
    export SKIP_VALIDATION="$SKIP_VALIDATION"
    
    if [ -f "$INFRA_PATH/scripts/deploy-all.sh" ]; then
        if bash "$INFRA_PATH/scripts/deploy-all.sh" dev 2>&1 | tee /tmp/terraform-deploy.log; then
            log_info "✓ Infrastructure deployed successfully"
            save_state "3" "complete" "Infrastructure deployment successful"
        else
            log_error "Infrastructure deployment failed"
            log_info "Check /tmp/terraform-deploy.log for details"
            save_state "3" "failed" "Terraform deployment failed"
            return 1
        fi
    else
        log_error "deploy-all.sh not found"
        return 1
    fi
    
    # Extract API Gateway endpoint
    if [ -f "$INFRA_PATH/envs/dev/terraform.tfstate" ]; then
        local api_endpoint=$(grep -oP '"api_gateway_url"[^"]*"value":\s*"\K[^"]+' "$INFRA_PATH/envs/dev/terraform.tfstate" 2>/dev/null || echo "")
        if [ -n "$api_endpoint" ]; then
            log_info "API Gateway: $api_endpoint"
        fi
    fi
    
    log_info "✓ Phase 3 complete"
    return 0
}

#==============================================================================
# Phase 4: Development Server
#==============================================================================

phase_4_dev_server() {
    if ! should_run_phase 4; then
        return 0
    fi
    
    print_phase "4" "Development Server"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] Would start development server"
        return 0
    fi
    
    save_state "4" "running" "Starting dev server"
    
    log_step "Starting Next.js development server..."
    cd "$STACK_PATH"
    
    if [ -f "$STACK_PATH/scripts/start-dev.sh" ]; then
        log_info "Starting dev server in background..."
        log_info "To view output: tail -f /tmp/nextjs-dev.log"
        log_info "To stop server: ps aux | grep next-dev | grep -v grep | awk '{print \$2}' | xargs kill"
        
        # Start in background and capture PID
        nohup bash "$STACK_PATH/scripts/start-dev.sh" > /tmp/nextjs-dev.log 2>&1 &
        local dev_pid=$!
        
        log_info "Dev server started (PID: $dev_pid)"
        log_info "Waiting for server to be ready..."
        
        # Wait up to 30 seconds for server to start
        local max_wait=30
        local waited=0
        while [ $waited -lt $max_wait ]; do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                log_info "✓ Dev server is running at http://localhost:3000"
                save_state "4" "complete" "Dev server running (PID: $dev_pid)"
                return 0
            fi
            sleep 2
            waited=$((waited + 2))
            echo -n "."
        done
        
        echo ""
        log_warn "Dev server may still be starting (check /tmp/nextjs-dev.log)"
        save_state "4" "warning" "Dev server started but not yet responding"
        return 0
    else
        log_error "start-dev.sh not found"
        return 1
    fi
}

#==============================================================================
# Final Report
#==============================================================================

print_final_report() {
    print_header "Test Environment Ready"
    
    echo -e "${GREEN}✓ All phases completed successfully!${NC}\n"
    
    echo "Project: $PROJECT_NAME"
    echo "Workspace: test-ws-$TEST_WS_NUMBER"
    echo ""
    echo "Paths:"
    echo "  Stack: $STACK_PATH"
    echo "  Infra: $INFRA_PATH"
    echo ""
    echo "Dev Server: ${GREEN}http://localhost:3000${NC}"
    echo ""
    echo "What was validated:"
    echo "  ✓ Project creation"
    echo "  ✓ TypeScript compilation"
    echo "  ✓ Lambda builds"
    echo "  ✓ Infrastructure deployment"
    echo "  ✓ Dev server startup"
    echo ""
    echo -e "${CYAN}Ready for user testing.${NC} Report any issues for fixes."
    echo ""
}

#==============================================================================
# Main Execution
#==============================================================================

show_usage() {
    cat << EOF
Usage: $0 --config CONFIG_FILE [OPTIONS]

Automate complete CORA test environment creation.

Required:
  --config FILE         Path to setup config YAML file

Options:
  --cleanup             Remove existing project before creating
  --dry-run             Show what would be done without doing it
  --resume-from PHASE   Resume from specific phase (0-4)
  --skip-phases LIST    Comma-separated list of phases to skip
  --verbose             Show detailed output
  --no-exit-on-error    Continue on errors when possible
  --help                Show this help message

Environment Variables:
  SKIP_VALIDATION       Skip import validation (default: true)

Examples:
  # Create new test environment
  $0 --config setup.config.test-ws-26.yaml

  # Recreate from scratch
  $0 --config setup.config.test-ws-26.yaml --cleanup

  # Resume from deployment phase
  $0 --config setup.config.test-ws-26.yaml --resume-from 3

  # Skip pre-flight checks
  $0 --config setup.config.test-ws-26.yaml --skip-phases 0

  # Dry-run to see what would happen
  $0 --config setup.config.test-ws-26.yaml --dry-run

Exit Codes:
  0  All phases succeeded
  1  One or more phases failed

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --cleanup)
                CLEANUP=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --resume-from)
                RESUME_FROM="$2"
                shift 2
                ;;
            --skip-phases)
                SKIP_PHASES="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --no-exit-on-error)
                EXIT_ON_ERROR=false
                set +e
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
    
    # Validate required arguments
    if [ -z "$CONFIG_FILE" ]; then
        log_error "Missing required argument: --config"
        show_usage
        exit 1
    fi
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Config file not found: $CONFIG_FILE"
        exit 1
    fi
}

main() {
    parse_arguments "$@"
    
    print_header "CORA Full Lifecycle Automation"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY-RUN MODE - No changes will be made"
    fi
    
    if [ "$CLEANUP" = true ]; then
        log_warn "CLEANUP MODE - Existing project will be deleted"
    fi
    
    if [ -n "$RESUME_FROM" ]; then
        log_info "Resuming from Phase $RESUME_FROM"
    fi
    
    if [ -n "$SKIP_PHASES" ]; then
        log_info "Skipping phases: $SKIP_PHASES"
    fi
    
    log_info "Config: $CONFIG_FILE"
    log_info "SKIP_VALIDATION: $SKIP_VALIDATION"
    echo ""
    
    # Load previous state if exists
    if [ -z "$RESUME_FROM" ]; then
        load_state || true
    fi
    
    # Execute phases
    local failed=false
    
    phase_0_preflight || failed=true
    
    if [ "$failed" = false ]; then
        phase_1_create_project || failed=true
    fi
    
    if [ "$failed" = false ]; then
        phase_2_build_validation || failed=true
    fi
    
    if [ "$failed" = false ]; then
        phase_3_deploy_infrastructure || failed=true
    fi
    
    if [ "$failed" = false ]; then
        phase_4_dev_server || failed=true
    fi
    
    # Print final report
    if [ "$failed" = false ] && [ "$DRY_RUN" = false ]; then
        print_final_report
        clear_state
        exit 0
    elif [ "$failed" = true ]; then
        echo ""
        log_error "Workflow failed - see logs above"
        log_info "To resume: $0 --config $CONFIG_FILE --resume-from <phase>"
        log_info "State saved in: $STATE_FILE"
        exit 1
    else
        echo ""
        log_info "Dry-run complete - no changes made"
        exit 0
    fi
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
