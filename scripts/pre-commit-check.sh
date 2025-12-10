#!/bin/bash

# Pre-commit hook to check for direct Supabase client instantiation in lambdas

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Files to check
files_to_check=$(git diff --cached --name-only --diff-filter=ACM | grep 'lambda_function.py')

if [ -z "$files_to_check" ]; then
    exit 0
fi

echo "Running pre-commit checks..."

# Flag to indicate if any file fails the check
failed=0

for file in $files_to_check; do
    # Check for "from supabase import create_client"
    if grep -q "from supabase import create_client" "$file"; then
        echo -e "${RED}ERROR: Direct Supabase client import found in $file.${NC}"
        echo -e "${YELLOW}Please use 'from org_common.supabase_client import get_supabase_client' instead.${NC}"
        failed=1
    fi
done

# Navigation pattern validation functions
check_navigation_pattern() {
    echo "Checking navigation pattern compliance..."
    local nav_files=$(git diff --cached --name-only --diff-filter=ACM | grep 'navigation.ts$')
    local nav_failed=0

    for file in $nav_files; do
        if [ ! -f "$file" ]; then
            continue
        fi

        # Ensure navigation files export NavSectionConfig
        if ! grep -q "NavSectionConfig" "$file"; then
            echo -e "${RED}ERROR: $file must export NavSectionConfig type${NC}"
            nav_failed=1
        fi

        # Ensure navigation files import from shared-types
        if ! grep -q "@sts-career/shared-types" "$file"; then
            echo -e "${RED}ERROR: $file must import types from @sts-career/shared-types${NC}"
            nav_failed=1
        fi

        # Check module navigation has single item (exclude org-module)
        if [[ $file == *"packages/"* ]] && [[ $file != *"org-module"* ]]; then
            # Count items in the items array - look for multiple objects after "items:"
            local content=$(cat "$file")
            if echo "$content" | grep -A 20 "items:" | grep -c "id:" | grep -q "[2-9]"; then
                echo -e "${YELLOW}WARNING: Module navigation in $file should have exactly one nav item${NC}"
            fi
        fi
    done

    return $nav_failed
}

check_sidebar_hardcoded_nav() {
    echo "Checking Sidebar for hardcoded navigation..."
    local sidebar_file="packages/org-module/frontend/components/layout/Sidebar.tsx"

    if git diff --cached --name-only | grep -q "$sidebar_file"; then
        if [ -f "$sidebar_file" ]; then
            # Check if the staged changes add hardcoded navItems
            if git diff --cached "$sidebar_file" | grep -E "^\+.*const navItems.*=.*\[" > /dev/null; then
                echo -e "${RED}ERROR: Sidebar.tsx must not contain hardcoded navItems array${NC}"
                echo -e "${YELLOW}Use the navigation prop instead${NC}"
                return 1
            fi
        fi
    fi
    return 0
}

check_app_shell_composition() {
    echo "Checking app shell navigation composition..."
    local layout_file="apps/frontend/src/app/layout.tsx"

    if git diff --cached --name-only | grep -q "$layout_file"; then
        if [ -f "$layout_file" ]; then
            # Check if Sidebar is used without navigation prop
            local content=$(cat "$layout_file")
            if echo "$content" | grep -q "<Sidebar" && ! echo "$content" | grep -q "navigation="; then
                echo -e "${RED}ERROR: layout.tsx must pass navigation prop to Sidebar${NC}"
                return 1
            fi
        fi
    fi
    return 0
}

# Run navigation checks if navigation-related files are being committed
if git diff --cached --name-only | grep -E "(navigation\\.ts|Sidebar\\.tsx|layout\\.tsx)"; then
    check_navigation_pattern || failed=1
    check_sidebar_hardcoded_nav || failed=1
    check_app_shell_composition || failed=1
fi

# Frontend compliance checks
check_frontend_compliance() {
    echo "Checking frontend compliance..."
    
    # Get staged frontend files (TypeScript/TSX in packages/*/frontend/)
    local frontend_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E 'packages/.*/frontend/.*\.(ts|tsx)$')
    
    if [ -z "$frontend_files" ]; then
        return 0
    fi
    
    echo "Found staged frontend files, running compliance checker..."
    
    # Run frontend compliance checker
    if ! npx ts-node scripts/check-frontend-compliance.ts; then
        echo -e "${RED}Frontend compliance check failed!${NC}"
        echo -e "${YELLOW}Fix compliance issues or use 'git commit --no-verify' to skip (not recommended)${NC}"
        return 1
    fi
    
    return 0
}

# TypeScript type checking
check_typescript_errors() {
    echo "Checking TypeScript compilation..."
    
    # Get staged TypeScript files
    local ts_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
    
    if [ -z "$ts_files" ]; then
        return 0
    fi
    
    echo "Found staged TypeScript files, running type check..."
    
    # Run TypeScript type check (full check, not file-by-file)
    if ! npm run type-check 2>&1 | grep -q "Found 0 errors"; then
        echo -e "${YELLOW}⚠️  TypeScript errors detected!${NC}"
        echo -e "${YELLOW}Run './scripts/analyze-typescript-errors.sh' for detailed analysis${NC}"
        echo -e "${YELLOW}Fix errors or use 'git commit --no-verify' to skip (not recommended)${NC}"
        return 1
    fi
    
    return 0
}

# Run frontend compliance checks if frontend files are being committed
if git diff --cached --name-only | grep -E 'packages/.*/frontend/.*\.(ts|tsx)$' > /dev/null; then
    check_frontend_compliance || failed=1
fi

# Run TypeScript checks if any TypeScript files are being committed
if git diff --cached --name-only | grep -E '\.(ts|tsx)$' > /dev/null; then
    check_typescript_errors || failed=1
fi

if [ $failed -eq 1 ]; then
    echo -e "${RED}Pre-commit checks failed. Please fix the issues before committing.${NC}"
    exit 1
fi

echo "Pre-commit checks passed."
exit 0
