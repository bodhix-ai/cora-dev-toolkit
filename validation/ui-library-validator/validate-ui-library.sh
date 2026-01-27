#!/bin/bash
# CORA UI Library Compliance Validator
# Validates that all modules use Material-UI (@mui/material) ONLY
# Detects Shadcn UI, styled-components, Tailwind CSS, and other non-compliant UI libraries

set -e

echo "=============================================================================="
echo "CORA UI Library Compliance Validation"
echo "=============================================================================="
echo ""

ERRORS=0
WARNINGS=0
SCAN_PATH="${1:-templates}"

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Scanning path: $SCAN_PATH"
echo ""

# ============================================================================
# CHECK 1: Tailwind CSS Class Usage in TSX/JSX Files
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 1: Scanning for Tailwind CSS class usage in components"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Common Tailwind patterns to detect
TAILWIND_PATTERNS=(
  "className=\".*\b(flex|grid|block|inline|hidden)\b.*\""
  "className=\".*\b(px-|py-|pt-|pb-|pl-|pr-|p-)[0-9].*\""
  "className=\".*\b(mx-|my-|mt-|mb-|ml-|mr-|m-)[0-9].*\""
  "className=\".*\b(text-|bg-|border-)(gray|red|blue|green|yellow|purple|pink|indigo)-[0-9].*\""
  "className=\".*\brounded(-lg|-md|-sm|-xl|-full)?\b.*\""
  "className=\".*\b(w-|h-)(full|screen|auto|[0-9]).*\""
  "className=\".*\b(gap-|space-x-|space-y-)[0-9].*\""
  "className=\".*\b(font-|text-)(xs|sm|base|lg|xl|2xl|3xl|4xl|bold|medium|semibold).*\""
  "className=\".*\b(items-|justify-|content-|self-)(start|end|center|between|around|stretch).*\""
  "className=\".*\bhover:(bg-|text-|border-).*\""
)

TAILWIND_VIOLATIONS=""
TAILWIND_FILES=0

for pattern in "${TAILWIND_PATTERNS[@]}"; do
  MATCHES=$(grep -r -E "$pattern" "$SCAN_PATH" \
    --include="*.tsx" \
    --include="*.jsx" \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=dist \
    2>/dev/null || true)
  
  if [ -n "$MATCHES" ]; then
    TAILWIND_VIOLATIONS="$TAILWIND_VIOLATIONS$MATCHES"$'\n'
    TAILWIND_FILES=$((TAILWIND_FILES + 1))
  fi
done

if [ -n "$TAILWIND_VIOLATIONS" ]; then
  echo -e "${RED}❌ VIOLATION: Found Tailwind CSS class usage in components${NC}"
  echo ""
  echo "Files with Tailwind classes detected:"
  echo ""
  
  # Get unique files
  echo "$TAILWIND_VIOLATIONS" | grep -o '^[^:]*' | sort -u | while read -r file; do
    if [ -n "$file" ]; then
      echo "  $file"
    fi
  done
  
  echo ""
  echo "  CORA Standard: Use Material-UI sx prop instead of Tailwind classes"
  echo "  Example:"
  echo "    ❌ className=\"flex items-center gap-2 px-4 py-2\""
  echo "    ✅ sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 4, py: 2 }}"
  echo ""
  echo "  See: docs/standards/standard_CORA-UI-LIBRARY.md"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Tailwind CSS classes found${NC}"
fi
echo ""

# ============================================================================
# CHECK 2: Tailwind Configuration Files
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 2: Scanning for Tailwind configuration files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TAILWIND_CONFIGS=$(find "$SCAN_PATH" -type f \( -name "tailwind.config.js" -o -name "tailwind.config.ts" -o -name "tailwind.config.cjs" \) 2>/dev/null || true)

if [ -n "$TAILWIND_CONFIGS" ]; then
  echo -e "${RED}❌ VIOLATION: Found Tailwind configuration files${NC}"
  echo ""
  echo "$TAILWIND_CONFIGS" | while read -r file; do
    echo "  $file"
  done
  echo ""
  echo "  CORA Standard: Remove Tailwind CSS configuration"
  echo "  Use Material-UI theme configuration instead"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Tailwind configuration files found${NC}"
fi
echo ""

# ============================================================================
# CHECK 3: Tailwind Directives in CSS Files
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 3: Scanning for Tailwind directives in CSS files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TAILWIND_DIRECTIVES=$(grep -r "@tailwind" "$SCAN_PATH" \
  --include="*.css" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  2>/dev/null || true)

if [ -n "$TAILWIND_DIRECTIVES" ]; then
  echo -e "${RED}❌ VIOLATION: Found @tailwind directives in CSS files${NC}"
  echo ""
  echo "$TAILWIND_DIRECTIVES" | while read -r line; do
    echo "  $line"
  done
  echo ""
  echo "  CORA Standard: Remove @tailwind directives"
  echo "  Use Material-UI theme and sx prop for styling"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No @tailwind directives found${NC}"
fi
echo ""

# ============================================================================
# CHECK 4: Shadcn UI Imports (@/components/ui/*)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 4: Scanning for Shadcn UI imports (@/components/ui/*)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SHADCN_IMPORTS=$(grep -r "from ['\"]@/components/ui" "$SCAN_PATH" 2>/dev/null | grep -v node_modules | grep -v ".next" || true)

if [ -n "$SHADCN_IMPORTS" ]; then
  echo -e "${RED}❌ VIOLATION: Found Shadcn UI imports (@/components/ui/*)${NC}"
  echo ""
  echo "$SHADCN_IMPORTS" | while read -r line; do
    echo "  $line"
  done
  echo ""
  echo "  CORA Standard: Use Material-UI (@mui/material) instead"
  echo "  See: docs/standards/standard_CORA-FRONTEND.md Section 4.2"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Shadcn UI imports found${NC}"
fi
echo ""

# ============================================================================
# CHECK 5: Custom UI Package Imports (@{{PROJECT_NAME}}/ui)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 5: Scanning for custom UI package imports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CUSTOM_UI_IMPORTS=$(grep -r "from ['\"]@{{PROJECT_NAME}}/ui" "$SCAN_PATH" 2>/dev/null | grep -v node_modules | grep -v ".next" || true)

if [ -n "$CUSTOM_UI_IMPORTS" ]; then
  echo -e "${RED}❌ VIOLATION: Found custom UI package imports (@{{PROJECT_NAME}}/ui)${NC}"
  echo ""
  echo "$CUSTOM_UI_IMPORTS" | while read -r line; do
    echo "  $line"
  done
  echo ""
  echo "  CORA Standard: Use Material-UI (@mui/material) instead"
  echo "  Custom UI packages are not permitted"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No custom UI package imports found${NC}"
fi
echo ""

# ============================================================================
# CHECK 6: styled-components Usage
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 6: Scanning for styled-components usage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STYLED_COMPONENTS=$(grep -r "import.*styled.*from ['\"]styled-components" "$SCAN_PATH" 2>/dev/null | grep -v node_modules | grep -v ".next" || true)

if [ -n "$STYLED_COMPONENTS" ]; then
  echo -e "${RED}❌ VIOLATION: Found styled-components usage${NC}"
  echo ""
  echo "$STYLED_COMPONENTS" | while read -r line; do
    echo "  $line"
  done
  echo ""
  echo "  CORA Standard: Use Material-UI sx prop instead"
  echo "  See: docs/standards/standard_CORA-FRONTEND.md Section 4.2"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No styled-components usage found${NC}"
fi
echo ""

# ============================================================================
# CHECK 7: Custom UI Package Directory Exists
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 7: Checking for custom UI package directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "$SCAN_PATH/_project-stack-template/packages/ui" ]; then
  echo -e "${RED}❌ VIOLATION: Custom UI package directory exists${NC}"
  echo ""
  echo "  Found: $SCAN_PATH/_project-stack-template/packages/ui/"
  echo ""
  echo "  CORA Standard: Remove custom UI packages"
  echo "  All modules must use Material-UI (@mui/material)"
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No custom UI package directory found${NC}"
fi
echo ""

# ============================================================================
# CHECK 8: Material-UI Usage (Positive Check)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 8: Verifying Material-UI usage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count modules with frontend
MODULE_COUNT=$(find "$SCAN_PATH/_modules-"* -type d -name "frontend" 2>/dev/null | wc -l | tr -d ' ')

# Count MUI imports
MUI_IMPORTS=$(grep -r "from ['\"]@mui/material" "$SCAN_PATH" 2>/dev/null | grep -v node_modules | grep -v ".next" | wc -l | tr -d ' ')

echo "Modules with frontend: $MODULE_COUNT"
echo "Files with @mui/material imports: $MUI_IMPORTS"
echo ""

if [ "$MODULE_COUNT" -gt 0 ] && [ "$MUI_IMPORTS" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  WARNING: Modules exist but no Material-UI imports found${NC}"
  echo ""
  echo "  Expected: Modules should use @mui/material for UI components"
  echo "  Found: $MODULE_COUNT modules, but $MUI_IMPORTS MUI imports"
  echo ""
  WARNINGS=$((WARNINGS + 1))
elif [ "$MUI_IMPORTS" -gt 0 ]; then
  echo -e "${GREEN}✅ Material-UI imports found ($MUI_IMPORTS files)${NC}"
else
  echo -e "${GREEN}✅ No modules to check${NC}"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "=============================================================================="
echo "VALIDATION SUMMARY"
echo "=============================================================================="
echo ""

TOTAL_ISSUES=$((ERRORS + WARNINGS))

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ FAILED: $ERRORS violation(s) found${NC}"
  echo ""
  echo "Violations must be fixed before proceeding."
  echo ""
  echo "Required Actions:"
  echo "  1. Remove all Tailwind CSS class usage"
  echo "  2. Remove Tailwind configuration files"
  echo "  3. Remove @tailwind directives from CSS files"
  echo "  4. Remove all Shadcn UI imports"
  echo "  5. Remove custom UI packages (packages/ui)"
  echo "  6. Rewrite components using Material-UI (@mui/material)"
  echo "  7. Remove styled-components usage"
  echo ""
  echo "Migration Guide:"
  echo "  - Replace className with sx prop"
  echo "  - Use Material-UI components (Box, Typography, Button, etc.)"
  echo "  - Use Material-UI theme for consistent styling"
  echo ""
  echo "See: docs/standards/standard_CORA-UI-LIBRARY.md"
  echo ""
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS: $WARNINGS warning(s)${NC}"
  echo ""
  echo "Warnings should be addressed but do not block progress."
  echo ""
  exit 0
else
  echo -e "${GREEN}✅ PASSED: All UI library compliance checks passed${NC}"
  echo ""
  echo "All modules follow CORA Material-UI standard."
  echo ""
  exit 0
fi
