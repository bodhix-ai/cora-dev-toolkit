#!/bin/bash
# Build script for module-eval-optimizer backend Lambdas
#
# Usage: ./build.sh [lambda-name]
#   If lambda-name is provided, only that Lambda will be built
#   Otherwise, all Lambdas will be built
#
# Output: .build/{lambda-name}.zip for each Lambda

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/.build"
LAMBDAS_DIR="${SCRIPT_DIR}/lambdas"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to build a single Lambda
build_lambda() {
    local lambda_name=$1
    local lambda_dir="${LAMBDAS_DIR}/${lambda_name}"
    local output_zip="${BUILD_DIR}/${lambda_name}.zip"
    local temp_dir="${BUILD_DIR}/${lambda_name}_temp"
    
    if [ ! -d "${lambda_dir}" ]; then
        log_error "Lambda directory not found: ${lambda_dir}"
        return 1
    fi
    
    log_info "Building Lambda: ${lambda_name}"
    
    # Create temp directory
    rm -rf "${temp_dir}"
    mkdir -p "${temp_dir}"
    
    # Copy Lambda code
    cp -r "${lambda_dir}"/*.py "${temp_dir}/" 2>/dev/null || true
    
    # Install requirements if present
    if [ -f "${lambda_dir}/requirements.txt" ]; then
        log_info "  Installing requirements..."
        pip install -r "${lambda_dir}/requirements.txt" -t "${temp_dir}" --quiet --upgrade
    fi
    
    # Remove unnecessary files
    find "${temp_dir}" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "${temp_dir}" -type f -name "*.pyc" -delete 2>/dev/null || true
    find "${temp_dir}" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
    find "${temp_dir}" -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
    
    # Create zip
    rm -f "${output_zip}"
    cd "${temp_dir}"
    zip -r "${output_zip}" . -x "*.pyc" -x "__pycache__/*" > /dev/null
    cd "${SCRIPT_DIR}"
    
    # Cleanup
    rm -rf "${temp_dir}"
    
    # Report size
    local size=$(du -h "${output_zip}" | cut -f1)
    log_info "  Created: ${output_zip} (${size})"
}

# Main script
main() {
    local target_lambda=$1
    
    # Create build directory
    mkdir -p "${BUILD_DIR}"
    
    if [ -n "${target_lambda}" ]; then
        # Build specific Lambda
        build_lambda "${target_lambda}"
    else
        # Build all Lambdas
        log_info "Building all Lambdas in ${LAMBDAS_DIR}"
        
        for lambda_dir in "${LAMBDAS_DIR}"/*/; do
            if [ -d "${lambda_dir}" ]; then
                lambda_name=$(basename "${lambda_dir}")
                build_lambda "${lambda_name}"
            fi
        done
    fi
    
    log_info "Build complete!"
    log_info "Output directory: ${BUILD_DIR}"
    ls -lh "${BUILD_DIR}"/*.zip 2>/dev/null || log_warn "No zip files found"
}

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Build script for module-eval-optimizer Lambdas"
    echo ""
    echo "Usage: ./build.sh [lambda-name]"
    echo ""
    echo "Options:"
    echo "  lambda-name    Build only the specified Lambda (e.g., opt-orchestrator)"
    echo "  --help, -h     Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./build.sh                    # Build all Lambdas"
    echo "  ./build.sh opt-orchestrator   # Build only opt-orchestrator"
    exit 0
fi

main "$@"