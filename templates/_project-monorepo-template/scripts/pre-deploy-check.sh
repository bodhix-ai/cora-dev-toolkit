#!/bin/bash

# Pre-Deployment Check Script
# Validates all build artifacts before expensive Terraform deployment
#
# Usage: ./pre-deploy-check.sh [OPTIONS]
#
# This script should be run from the project's infra repo directory.
# It checks the corresponding stack repo for build readiness.

set -e

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Derive stack path from infra path (replace -infra with -stack)
INFRA_BASENAME="$(basename "$INFRA_ROOT")"
STACK_BASENAME="${INFRA_BASENAME/-infra/-stack}"
STACK_ROOT="$(dirname "$INFRA_ROOT")/${STACK_BASENAME}"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[CHECK]${NC} $1"; }

ERRORS_FOUND=0
WARNINGS_FOUND=0

show_help() {
  cat << EOF
Pre-Deployment Check Script

Usage: $0 [OPTIONS]

Validates all build artifacts before expensive Terraform deployment.
Run this from the project's infra repo directory.

Checks performed:
  1. Stack repo exists and is accessible
  2. Lambda zip files exist for all modules
  3. Lambda zip files are recent (< 1 hour old)
  4. Authorizer Lambda zip exists
  5. TypeScript compilation passes (optional)

Options:
  --skip-typecheck    Skip TypeScript type checking
  --verbose           Show detailed output
  --help              Show this help message

Exit Codes:
  0 - All checks passed
  1 - One or more checks failed
  2 - Critical error (missing stack repo, etc.)

EOF
}

SKIP_TYPECHECK=false
VERBOSE=false

# --- Parse Arguments ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-typecheck)
      SKIP_TYPECHECK=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 2
      ;;
  esac
done

echo "========================================"
echo "  Pre-Deployment Validation Check"
echo "========================================"
echo ""
log_info "Infra Root: ${INFRA_ROOT}"
log_info "Stack Root: ${STACK_ROOT}"
echo ""

# --- Check 1: Stack Repo Exists ---
log_step "Check 1: Stack repo exists..."

if [[ ! -d "$STACK_ROOT" ]]; then
    log_error "Stack repo not found: ${STACK_ROOT}"
    log_error "Expected stack repo alongside infra repo."
    exit 2
fi

if [[ ! -f "${STACK_ROOT}/package.json" ]]; then
    log_error "Stack repo missing package.json: ${STACK_ROOT}"
    exit 2
fi

log_info "✅ Stack repo found"
echo ""

# --- Check 2: Lambda Zip Files Exist ---
log_step "Check 2: Module Lambda zip files exist..."

MODULES_WITH_LAMBDAS=()
MISSING_ZIPS=()

# Find all modules with backend directories
for module_dir in "${STACK_ROOT}"/packages/module-*/backend; do
    if [[ -d "$module_dir" ]]; then
        module_name=$(basename "$(dirname "$module_dir")")
        build_dir="${module_dir}/.build"
        
        if [[ -d "$build_dir" ]]; then
            # Check for at least one zip file
            zip_count=$(find "$build_dir" -name "*.zip" 2>/dev/null | wc -l)
            if [[ $zip_count -gt 0 ]]; then
                if $VERBOSE; then
                    log_info "  ${module_name}: ${zip_count} zip file(s) found"
                fi
                MODULES_WITH_LAMBDAS+=("$module_name")
            else
                log_warn "  ${module_name}: No zip files in .build directory"
                MISSING_ZIPS+=("$module_name")
                ERRORS_FOUND=$((ERRORS_FOUND + 1))
            fi
        else
            # Check if module has lambdas directory (should have .build)
            if [[ -d "${module_dir}/lambdas" ]]; then
                log_warn "  ${module_name}: Has lambdas but no .build directory (run build.sh)"
                MISSING_ZIPS+=("$module_name")
                ERRORS_FOUND=$((ERRORS_FOUND + 1))
            else
                if $VERBOSE; then
                    log_info "  ${module_name}: No lambdas (skipped)"
                fi
            fi
        fi
    fi
done

if [[ ${#MISSING_ZIPS[@]} -gt 0 ]]; then
    log_error "❌ Missing Lambda zips for: ${MISSING_ZIPS[*]}"
    log_info "Run 'bash build.sh' in each module's backend directory"
else
    log_info "✅ All module Lambda zips present (${#MODULES_WITH_LAMBDAS[@]} modules)"
fi
echo ""

# --- Check 3: Lambda Zips Are Recent ---
log_step "Check 3: Lambda zips are recent (< 1 hour old)..."

STALE_ZIPS=()
ONE_HOUR_AGO=$(($(date +%s) - 3600))

for module_dir in "${STACK_ROOT}"/packages/module-*/backend/.build; do
    if [[ -d "$module_dir" ]]; then
        module_name=$(basename "$(dirname "$(dirname "$module_dir")")")
        
        for zip_file in "$module_dir"/*.zip; do
            if [[ -f "$zip_file" ]]; then
                zip_mtime=$(stat -f %m "$zip_file" 2>/dev/null || stat -c %Y "$zip_file" 2>/dev/null)
                if [[ $zip_mtime -lt $ONE_HOUR_AGO ]]; then
                    zip_name=$(basename "$zip_file")
                    STALE_ZIPS+=("${module_name}/${zip_name}")
                    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
                fi
            fi
        done
    fi
done

if [[ ${#STALE_ZIPS[@]} -gt 0 ]]; then
    log_warn "⚠️  Some Lambda zips are > 1 hour old (may be stale):"
    for stale in "${STALE_ZIPS[@]}"; do
        log_warn "    - $stale"
    done
    log_info "Consider rebuilding if you've made recent Lambda changes"
else
    log_info "✅ All Lambda zips are recent"
fi
echo ""

# --- Check 4: Authorizer Lambda Exists ---
log_step "Check 4: Authorizer Lambda zip exists..."

AUTHORIZER_DIRS=(
    "${INFRA_ROOT}/lambdas/api-gateway-authorizer/build"
    "${INFRA_ROOT}/lambdas/authorizer/build"
    "${INFRA_ROOT}/lambdas/api-gateway-authorizer/.build"
    "${INFRA_ROOT}/lambdas/authorizer/.build"
)

AUTHORIZER_FOUND=false
for auth_dir in "${AUTHORIZER_DIRS[@]}"; do
    if [[ -d "$auth_dir" ]]; then
        auth_zip=$(find "$auth_dir" -name "*.zip" 2>/dev/null | head -1)
        if [[ -n "$auth_zip" ]]; then
            AUTHORIZER_FOUND=true
            if $VERBOSE; then
                log_info "  Found: $auth_zip"
            fi
            break
        fi
    fi
done

if $AUTHORIZER_FOUND; then
    log_info "✅ Authorizer Lambda zip found"
else
    log_warn "⚠️  Authorizer Lambda zip not found"
    log_info "If using authorizer, run build.sh in lambdas/api-gateway-authorizer/"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi
echo ""

# --- Check 5: TypeScript Type Check (Optional) ---
if ! $SKIP_TYPECHECK; then
    log_step "Check 5: TypeScript compilation..."
    
    if [[ -f "${STACK_ROOT}/package.json" ]]; then
        cd "$STACK_ROOT"
        
        # Check if node_modules exists
        if [[ ! -d "node_modules" ]]; then
            log_warn "node_modules not found, skipping type check"
            log_info "Run 'pnpm install' first for full validation"
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        else
            # Run type check
            if pnpm -r run type-check > /tmp/typecheck-output.txt 2>&1; then
                log_info "✅ TypeScript compilation passed"
            else
                log_error "❌ TypeScript errors found:"
                cat /tmp/typecheck-output.txt | head -50
                ERRORS_FOUND=$((ERRORS_FOUND + 1))
            fi
            rm -f /tmp/typecheck-output.txt
        fi
        
        cd "$INFRA_ROOT"
    fi
else
    log_info "Check 5: TypeScript compilation (SKIPPED)"
fi
echo ""

# --- Check 6: Terraform Validation ---
log_step "Check 6: Terraform configuration validation..."

if [[ -d "${INFRA_ROOT}/envs/dev" ]]; then
    cd "${INFRA_ROOT}/envs/dev"
    
    # Check if terraform is initialized
    if [[ ! -d ".terraform" ]]; then
        log_info "Terraform not initialized - running terraform init..."
        if terraform init > /tmp/tf-init.txt 2>&1; then
            log_info "✅ Terraform initialized successfully"
        else
            log_error "❌ Terraform init failed:"
            cat /tmp/tf-init.txt
            ERRORS_FOUND=$((ERRORS_FOUND + 1))
            rm -f /tmp/tf-init.txt
            cd "$INFRA_ROOT"
            echo ""
            # Skip validation if init failed
            continue
        fi
        rm -f /tmp/tf-init.txt
    fi
    
    # Now validate
    if terraform validate > /tmp/tf-validate.txt 2>&1; then
        log_info "✅ Terraform configuration valid"
    else
        # Check if error is due to missing providers
        if grep -q "Missing required provider" /tmp/tf-validate.txt; then
            log_info "Missing providers detected - running terraform init..."
            if terraform init > /tmp/tf-init.txt 2>&1; then
                log_info "✅ Terraform initialized successfully"
                # Try validation again
                if terraform validate > /tmp/tf-validate2.txt 2>&1; then
                    log_info "✅ Terraform configuration valid"
                else
                    log_error "❌ Terraform validation errors:"
                    cat /tmp/tf-validate2.txt
                    ERRORS_FOUND=$((ERRORS_FOUND + 1))
                fi
                rm -f /tmp/tf-validate2.txt
            else
                log_error "❌ Terraform init failed:"
                cat /tmp/tf-init.txt
                ERRORS_FOUND=$((ERRORS_FOUND + 1))
            fi
            rm -f /tmp/tf-init.txt
        else
            log_error "❌ Terraform validation errors:"
            cat /tmp/tf-validate.txt
            ERRORS_FOUND=$((ERRORS_FOUND + 1))
        fi
    fi
    rm -f /tmp/tf-validate.txt
    
    cd "$INFRA_ROOT"
else
    log_warn "envs/dev directory not found, skipping Terraform validation"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi
echo ""

# --- Summary ---
echo "========================================"
echo "  Pre-Deployment Check Summary"
echo "========================================"
echo ""

if [[ $ERRORS_FOUND -gt 0 ]]; then
    log_error "❌ FAILED: ${ERRORS_FOUND} error(s) found"
    if [[ $WARNINGS_FOUND -gt 0 ]]; then
        log_warn "   Plus ${WARNINGS_FOUND} warning(s)"
    fi
    echo ""
    log_info "Fix the errors above before deploying."
    log_info "This saves ~5 minutes of failed Terraform deployment."
    exit 1
elif [[ $WARNINGS_FOUND -gt 0 ]]; then
    log_warn "⚠️  PASSED with ${WARNINGS_FOUND} warning(s)"
    echo ""
    log_info "Deployment can proceed, but review warnings above."
    exit 0
else
    log_info "✅ ALL CHECKS PASSED"
    echo ""
    log_info "Ready for deployment: ./scripts/deploy-all.sh dev"
    exit 0
fi
