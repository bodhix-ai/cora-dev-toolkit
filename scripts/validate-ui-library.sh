#!/bin/bash
# CORA UI Library Compliance Validator
# Validates that all modules use Material-UI (@mui/material) ONLY
# Detects Shadcn UI, styled-components, and other non-compliant UI libraries

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
# CHECK 1: Shadcn UI Imports (@/components/ui/*)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 1: Scanning for Shadcn UI imports (@/components/ui/*)"
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
# CHECK 2: Custom UI Package Imports (@{{PROJECT_NAME}}/ui)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 2: Scanning for custom UI package imports"
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
# CHECK 3: styled-components Usage
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 3: Scanning for styled-components usage"
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
# CHECK 4: Custom UI Package Directory Exists
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 4: Checking for custom UI package directory"
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
# CHECK 5: Material-UI Usage (Positive Check)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHECK 5: Verifying Material-UI usage"
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
  echo "  1. Remove all Shadcn UI imports"
  echo "  2. Remove custom UI packages (packages/ui)"
  echo "  3. Rewrite components using Material-UI (@mui/material)"
  echo "  4. Remove styled-components usage"
  echo ""
  echo "See: docs/standards/standard_CORA-FRONTEND.md"
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
