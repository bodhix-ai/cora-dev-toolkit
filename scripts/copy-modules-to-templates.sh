#!/usr/bin/env bash
# ============================================================================
# copy-modules-to-templates.sh
# Requires: bash 4+ (for associative arrays)
# 
# Copies existing working modules from pm-app-stack to cora-dev-toolkit
# templates with parameterization for reuse in new CORA projects.
#
# This script:
# 1. Copies module directories from source to templates
# 2. Replaces project-specific values with placeholders
# 3. Follows CORA naming conventions
#
# Usage:
#   ./copy-modules-to-templates.sh [--dry-run] [--module MODULE_NAME]
#
# Options:
#   --dry-run   Preview changes without copying
#   --module    Copy only specified module (org, lambda-mgmt, ai-config, ai-enablement)
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default paths (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_STACK="${TOOLKIT_ROOT}/../pm-app-stack/packages"
TEMPLATE_DIR="${TOOLKIT_ROOT}/templates/_cora-core-modules"

# Flags
DRY_RUN=false
MODULE_FILTER=""

# Module mapping (simple variables instead of associative arrays for compatibility)
# org-module -> module-access
# lambda-mgmt-module -> module-mgmt  
# ai-config-module -> module-ai
# ai-enablement-module -> module-ai (merged)

# Parameterization patterns (applied via sed)
PARAM_PATTERNS="pm-app pm_app pmapp PolicyMind policymind"

# Files/directories to exclude from copy
EXCLUDE_PATTERNS=(
    "*.pyc"
    "__pycache__"
    "node_modules"
    ".terraform"
    "*.zip"
    "*.log"
    "build/"
    "dist/"
    ".DS_Store"
)

# ============================================================================
# Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo ""
    echo "Copy existing modules from pm-app-stack to templates with parameterization."
    echo ""
    echo "Options:"
    echo "  --dry-run           Preview changes without copying"
    echo "  --module MODULE     Copy only specified module:"
    echo "                        org, lambda-mgmt, ai-config, ai-enablement"
    echo "  --source PATH       Override source path (default: pm-app-stack/packages)"
    echo "  --target PATH       Override target path (default: templates/_cora-core-modules)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0") --dry-run                    # Preview all modules"
    echo "  $(basename "$0") --module org                 # Copy only org-module"
    echo "  $(basename "$0")                              # Copy all modules"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --module)
                MODULE_FILTER="$2"
                shift 2
                ;;
            --source)
                SOURCE_STACK="$2"
                shift 2
                ;;
            --target)
                TEMPLATE_DIR="$2"
                shift 2
                ;;
            -h|--help)
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
}

# Build rsync exclude arguments
build_exclude_args() {
    local args=""
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        args="$args --exclude='$pattern'"
    done
    echo "$args"
}

# Apply parameterization to a file
parameterize_file() {
    local file="$1"
    local temp_file="${file}.tmp"
    
    # Skip binary files
    if file "$file" | grep -q "binary"; then
        return 0
    fi
    
    cp "$file" "$temp_file"
    
    # Apply replacements (macOS compatible sed)
    sed -i '' -e 's|pm-app|\${project}|g' \
              -e 's|pm_app|\${project}|g' \
              -e 's|pmapp|\${project}|g' \
              -e 's|PolicyMind|\${project_display_name}|g' \
              -e 's|policymind|\${project}|g' \
              "$temp_file" 2>/dev/null || \
    sed -i -e 's|pm-app|\${project}|g' \
           -e 's|pm_app|\${project}|g' \
           -e 's|pmapp|\${project}|g' \
           -e 's|PolicyMind|\${project_display_name}|g' \
           -e 's|policymind|\${project}|g' \
           "$temp_file" 2>/dev/null || true
    
    # Check if file changed
    if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then
        mv "$temp_file" "$file"
        echo "  Parameterized: $(basename "$file")"
    else
        rm "$temp_file"
    fi
}

# Copy a module
copy_module() {
    local source_name="$1"
    local target_name="$2"
    local source_path="${SOURCE_STACK}/${source_name}"
    local target_path="${TEMPLATE_DIR}/${target_name}"
    
    if [[ ! -d "$source_path" ]]; then
        log_error "Source module not found: $source_path"
        return 1
    fi
    
    log_info "Copying: ${source_name} → ${target_name}"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would copy: $source_path → $target_path"
        echo "  Files to copy:"
        find "$source_path" -type f | head -20
        if [[ $(find "$source_path" -type f | wc -l) -gt 20 ]]; then
            echo "  ... and more files"
        fi
        return 0
    fi
    
    # Create target directory
    mkdir -p "$target_path"
    
    # Build exclude args
    local exclude_args=""
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args="$exclude_args --exclude=$pattern"
    done
    
    # Copy with rsync
    rsync -av $exclude_args "$source_path/" "$target_path/"
    
    log_success "Copied ${source_name} to ${target_name}"
}

# Apply parameterization to all files in a directory
parameterize_directory() {
    local dir="$1"
    
    log_info "Parameterizing: $dir"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would parameterize files in: $dir"
        echo "  Patterns to replace:"
        echo "    pm-app → \${project}"
        echo "    pm_app → \${project}"
        echo "    pmapp → \${project}"
        echo "    PolicyMind → \${project_display_name}"
        echo "    policymind → \${project}"
        return 0
    fi
    
    # Find and parameterize text files
    find "$dir" -type f \( \
        -name "*.py" -o \
        -name "*.ts" -o \
        -name "*.tsx" -o \
        -name "*.js" -o \
        -name "*.json" -o \
        -name "*.sql" -o \
        -name "*.tf" -o \
        -name "*.md" -o \
        -name "*.sh" -o \
        -name "*.yaml" -o \
        -name "*.yml" \
    \) | while read -r file; do
        parameterize_file "$file"
    done
    
    log_success "Parameterization complete"
}

# Create module.json for a template
create_module_json() {
    local target_path="$1"
    local module_name="$2"
    local display_name="$3"
    local description="$4"
    local tier="$5"
    
    local json_path="${target_path}/module.json"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would create module.json at: $json_path"
        return 0
    fi
    
    # Only create if doesn't exist (preserve existing)
    if [[ -f "$json_path" ]]; then
        log_warning "module.json already exists, skipping: $json_path"
        return 0
    fi
    
    cat > "$json_path" << EOF
{
  "name": "${module_name}",
  "displayName": "${display_name}",
  "description": "${description}",
  "version": "1.0.0",
  "tier": ${tier},
  "category": "core",
  "status": "active",
  "source": "pm-app-stack",
  "note": "Copied from working pm-app-stack implementation"
}
EOF
    
    log_success "Created module.json for ${module_name}"
}

# ============================================================================
# Main
# ============================================================================

main() {
    parse_args "$@"
    
    echo ""
    echo "=========================================="
    echo "CORA Module Template Generator"
    echo "=========================================="
    echo ""
    
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "Running in DRY-RUN mode - no changes will be made"
        echo ""
    fi
    
    # Verify paths
    if [[ ! -d "$SOURCE_STACK" ]]; then
        log_error "Source path not found: $SOURCE_STACK"
        exit 1
    fi
    
    log_info "Source: $SOURCE_STACK"
    log_info "Target: $TEMPLATE_DIR"
    echo ""
    
    # Process modules
    if [[ -n "$MODULE_FILTER" ]]; then
        # Single module
        case "$MODULE_FILTER" in
            org)
                copy_module "org-module" "module-access"
                parameterize_directory "${TEMPLATE_DIR}/module-access"
                create_module_json "${TEMPLATE_DIR}/module-access" \
                    "module-access" "Access Control" \
                    "Identity and access control (from org-module)" 1
                ;;
            lambda-mgmt)
                copy_module "lambda-mgmt-module" "module-mgmt"
                parameterize_directory "${TEMPLATE_DIR}/module-mgmt"
                create_module_json "${TEMPLATE_DIR}/module-mgmt" \
                    "module-mgmt" "Platform Management" \
                    "Lambda and platform management (from lambda-mgmt-module)" 3
                ;;
            ai-config)
                copy_module "ai-config-module" "module-ai"
                parameterize_directory "${TEMPLATE_DIR}/module-ai"
                create_module_json "${TEMPLATE_DIR}/module-ai" \
                    "module-ai" "AI Provider Management" \
                    "AI configuration (from ai-config-module)" 2
                ;;
            ai-enablement)
                copy_module "ai-enablement-module" "module-ai"
                parameterize_directory "${TEMPLATE_DIR}/module-ai"
                ;;
            *)
                log_error "Unknown module: $MODULE_FILTER"
                echo "Available: org, lambda-mgmt, ai-config, ai-enablement"
                exit 1
                ;;
        esac
    else
        # All modules
        log_info "Processing all core modules..."
        echo ""
        
        # module-access (from org-module)
        copy_module "org-module" "module-access"
        parameterize_directory "${TEMPLATE_DIR}/module-access"
        create_module_json "${TEMPLATE_DIR}/module-access" \
            "module-access" "Access Control" \
            "Identity and access control (copied from org-module)" 1
        echo ""
        
        # module-mgmt (from lambda-mgmt-module)
        # Note: Phase 4 already added module registry to module-mgmt
        # This will merge with existing content
        log_warning "module-mgmt already has Phase 4 content - merging..."
        copy_module "lambda-mgmt-module" "module-mgmt"
        parameterize_directory "${TEMPLATE_DIR}/module-mgmt"
        echo ""
        
        # module-ai (from ai-config-module + ai-enablement-module)
        log_info "module-ai requires merging ai-config-module and ai-enablement-module"
        log_info "Step 1: Copying ai-config-module (base)..."
        copy_module "ai-config-module" "module-ai"
        
        log_info "Step 2: Merging ai-enablement-module into module-ai..."
        # Copy ai-enablement-module, merging directories
        copy_module "ai-enablement-module" "module-ai"
        
        parameterize_directory "${TEMPLATE_DIR}/module-ai"
        create_module_json "${TEMPLATE_DIR}/module-ai" \
            "module-ai" "AI Provider Management" \
            "AI configuration and provider management (merged from ai-config-module and ai-enablement-module)" 2
        echo ""
    fi
    
    echo "=========================================="
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY-RUN complete - no changes made"
        echo "Run without --dry-run to apply changes"
    else
        log_success "Module template generation complete!"
    fi
    echo "=========================================="
}

main "$@"
