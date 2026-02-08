#!/bin/bash
# Build script for eval_opt_common Lambda layer
#
# Usage: ./build.sh
# Output: .build/eval_opt_common.zip

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/.build"
OUTPUT_ZIP="${BUILD_DIR}/eval_opt_common.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Main build
main() {
    log_info "Building eval_opt_common Lambda layer..."
    
    # Create build directory
    rm -rf "${BUILD_DIR}"
    mkdir -p "${BUILD_DIR}/python"
    
    # Copy Python package
    cp -r "${SCRIPT_DIR}/python/eval_opt_common" "${BUILD_DIR}/python/"
    
    # Install any requirements if present
    if [ -f "${SCRIPT_DIR}/requirements.txt" ]; then
        log_info "Installing requirements..."
        pip install -r "${SCRIPT_DIR}/requirements.txt" -t "${BUILD_DIR}/python" --quiet --upgrade
    fi
    
    # Remove unnecessary files
    find "${BUILD_DIR}" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "${BUILD_DIR}" -type f -name "*.pyc" -delete 2>/dev/null || true
    find "${BUILD_DIR}" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
    find "${BUILD_DIR}" -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
    
    # Create zip
    rm -f "${OUTPUT_ZIP}"
    cd "${BUILD_DIR}"
    zip -r "${OUTPUT_ZIP}" python -x "*.pyc" -x "__pycache__/*" > /dev/null
    cd "${SCRIPT_DIR}"
    
    # Report size
    local size=$(du -h "${OUTPUT_ZIP}" | cut -f1)
    log_info "Created: ${OUTPUT_ZIP} (${size})"
    
    log_info "Build complete!"
}

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Build script for eval_opt_common Lambda layer"
    echo ""
    echo "Usage: ./build.sh"
    echo ""
    echo "Output: .build/eval_opt_common.zip"
    exit 0
fi

main "$@"