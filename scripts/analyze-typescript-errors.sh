#!/bin/bash

# TypeScript Error Analysis Script
# Outputs structured error report for AI-assisted fixing

set -e

echo "🔍 Analyzing TypeScript Errors..."
echo ""

# Run type check and capture output
OUTPUT=$(npm run type-check 2>&1 || true)

# Check if there are errors
if ! echo "$OUTPUT" | grep -q "error TS"; then
    echo "✅ No TypeScript errors found!"
    exit 0
fi

# Extract just the error lines
ERRORS=$(echo "$OUTPUT" | grep "error TS" || true)

# Count error categories (use explicit || true to avoid exit on 0 matches)
MISSING_MODULES=$(echo "$ERRORS" | grep "Cannot find module" | wc -l | tr -d ' ')
MISSING_PROPERTIES=$(echo "$ERRORS" | grep "does not exist on type" | wc -l | tr -d ' ')
IMPLICIT_ANY=$(echo "$ERRORS" | grep "implicitly has an 'any' type" | grep -v "Binding element" | wc -l | tr -d ' ')
MISSING_EXPORTS=$(echo "$ERRORS" | grep "has no exported member" | wc -l | tr -d ' ')
NOT_CALLABLE=$(echo "$ERRORS" | grep "is not callable" | wc -l | tr -d ' ')
BINDING_ANY=$(echo "$ERRORS" | grep "Binding element .* implicitly has an 'any' type" | wc -l | tr -d ' ')

TOTAL=$((MISSING_MODULES + MISSING_PROPERTIES + IMPLICIT_ANY + MISSING_EXPORTS + NOT_CALLABLE + BINDING_ANY))

# Generate structured report
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TYPESCRIPT ERROR ANALYSIS REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Errors: $TOTAL"
echo ""
echo "┌─────────────────────────────────────────────────┐"
echo "│ ERROR CATEGORIES                                │"
echo "├─────────────────────────────────────────────────┤"
echo "│ 1. Missing Modules:            $MISSING_MODULES errors     │"
echo "│ 2. Missing Properties:         $MISSING_PROPERTIES errors     │"
echo "│ 3. Implicit 'any' Types:       $IMPLICIT_ANY errors     │"
echo "│ 4. Binding Element 'any':      $BINDING_ANY errors      │"
echo "│ 5. Missing Exports:            $MISSING_EXPORTS error      │"
echo "│ 6. Not Callable:               $NOT_CALLABLE error      │"
echo "└─────────────────────────────────────────────────┘"
echo ""

# Priority order for fixing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 RECOMMENDED FIX ORDER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Fix in this order (fixes cascade to reduce total errors):"
echo ""

# Determine highest priority issue
if [ "$MISSING_MODULES" -gt 0 ]; then
    echo "⚠️  PRIORITY 1: Fix Missing Modules ($MISSING_MODULES errors)"
    echo "    → These often cause cascading errors"
    echo "    → See detailed breakdown below"
    echo ""
fi

if [ "$MISSING_EXPORTS" -gt 0 ]; then
    echo "⚠️  PRIORITY 2: Fix Missing Exports ($MISSING_EXPORTS errors)"
    echo "    → Import statement issues"
    echo "    → See detailed breakdown below"
    echo ""
fi

if [ "$NOT_CALLABLE" -gt 0 ]; then
    echo "⚠️  PRIORITY 3: Fix Not Callable Errors ($NOT_CALLABLE errors)"
    echo "    → API usage issues"
    echo "    → See detailed breakdown below"
    echo ""
fi

if [ "$MISSING_PROPERTIES" -gt 0 ]; then
    echo "⚠️  PRIORITY 4: Fix Missing Properties ($MISSING_PROPERTIES errors)"
    echo "    → Type augmentation needed"
    echo "    → See detailed breakdown below"
    echo ""
fi

if [ "$IMPLICIT_ANY" -gt 0 ] || [ "$BINDING_ANY" -gt 0 ]; then
    TOTAL_ANY=$((IMPLICIT_ANY + BINDING_ANY))
    echo "⚠️  PRIORITY 5: Fix Implicit 'any' Types ($TOTAL_ANY errors)"
    echo "    → Add type annotations"
    echo "    → See detailed breakdown below"
    echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 DETAILED ERROR BREAKDOWN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Missing Modules
if [ "$MISSING_MODULES" -gt 0 ]; then
    echo "═══════════════════════════════════════════════════"
    echo "1️⃣  MISSING MODULES ($MISSING_MODULES errors)"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "Files affected:"
    echo "$ERRORS" | grep "Cannot find module" | cut -d'(' -f1 | sort -u | sed 's/^/  • /'
    echo ""
    echo "Missing modules:"
    echo "$ERRORS" | grep "Cannot find module" | sed "s/.*Cannot find module '\([^']*\)'.*/\1/" | sort -u | sed 's/^/  • /'
    echo ""
    echo "🤖 NEXT STEP FOR AI:"
    echo "   Run: cline \"Check packages directory for these modules and verify their build status\""
    echo ""
    echo "───────────────────────────────────────────────────"
    echo ""
fi

# 2. Missing Exports
if [ "$MISSING_EXPORTS" -gt 0 ]; then
    echo "═══════════════════════════════════════════════════"
    echo "2️⃣  MISSING EXPORTS ($MISSING_EXPORTS errors)"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "Errors:"
    echo "$ERRORS" | grep "has no exported member"
    echo ""
    echo "🤖 NEXT STEP FOR AI:"
    echo "   Run: cline \"Check the next-auth version and find correct imports for NextAuthConfig\""
    echo ""
    echo "───────────────────────────────────────────────────"
    echo ""
fi

# 3. Not Callable
if [ "$NOT_CALLABLE" -gt 0 ]; then
    echo "═══════════════════════════════════════════════════"
    echo "3️⃣  NOT CALLABLE ERRORS ($NOT_CALLABLE errors)"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "Errors:"
    echo "$ERRORS" | grep "is not callable"
    echo ""
    echo "🤖 NEXT STEP FOR AI:"
    echo "   Run: cline \"Read the file with 'not callable' error and fix the NextAuth API usage\""
    echo ""
    echo "───────────────────────────────────────────────────"
    echo ""
fi

# 4. Missing Properties
if [ "$MISSING_PROPERTIES" -gt 0 ]; then
    echo "═══════════════════════════════════════════════════"
    echo "4️⃣  MISSING PROPERTIES ($MISSING_PROPERTIES errors)"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "Properties missing from types:"
    echo "$ERRORS" | grep "does not exist on type" | sed "s/.*Property '\([^']*\)' does not exist on type '\([^']*\)'.*/  • Property: \1 on Type: \2/" | sort -u
    echo ""
    echo "Files affected:"
    echo "$ERRORS" | grep "does not exist on type" | cut -d'(' -f1 | sort -u | sed 's/^/  • /'
    echo ""
    echo "🤖 NEXT STEP FOR AI:"
    echo "   Run: cline \"Create type augmentation for Session to add accessToken property\""
    echo ""
    echo "───────────────────────────────────────────────────"
    echo ""
fi

# 5. Implicit 'any' Types
if [ "$IMPLICIT_ANY" -gt 0 ] || [ "$BINDING_ANY" -gt 0 ]; then
    TOTAL_ANY=$((IMPLICIT_ANY + BINDING_ANY))
    echo "═══════════════════════════════════════════════════"
    echo "5️⃣  IMPLICIT 'ANY' TYPES ($TOTAL_ANY errors)"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "Files with 'any' type issues:"
    echo "$ERRORS" | grep "implicitly has an 'any' type" | cut -d'(' -f1 | sort -u | sed 's/^/  • /'
    echo ""
    echo "🤖 NEXT STEP FOR AI:"
    echo "   Select one file and run:"
    echo "   cline \"Read [filename] and add type annotations for parameters with implicit 'any'\""
    echo ""
    echo "───────────────────────────────────────────────────"
    echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 SUGGESTED WORKFLOW"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Start with highest priority issue (see above)"
echo "2. Use the suggested 'NEXT STEP FOR AI' command"
echo "3. After AI applies fixes, run this script again:"
echo "   ./scripts/analyze-typescript-errors.sh"
echo "4. Repeat until all errors are resolved"
echo "5. When errors = 0, attempt commit"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save full error log
echo "$OUTPUT" > typescript-errors.log
echo "📄 Full error log saved to: typescript-errors.log"
echo ""

# VERIFICATION STEP: Run full type check to catch any uncategorized errors
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔬 FULL VERIFICATION CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running comprehensive type check to catch uncategorized errors..."
echo ""

# Count total errors from full output
TOTAL_ERRORS=$(echo "$OUTPUT" | grep "error TS" | wc -l | tr -d ' ')
CATEGORIZED_ERRORS=$TOTAL

if [ "$TOTAL_ERRORS" -gt "$CATEGORIZED_ERRORS" ]; then
    UNCATEGORIZED=$((TOTAL_ERRORS - CATEGORIZED_ERRORS))
    echo "⚠️  WARNING: Found $UNCATEGORIZED additional error(s) not in main categories"
    echo ""
    echo "These errors may include:"
    echo "  • Type assignment mismatches"
    echo "  • Function parameter type errors"
    echo "  • Overload resolution failures"
    echo "  • Other complex type issues"
    echo ""
    echo "📋 Uncategorized Errors:"
    echo ""
    
    # Show all errors that weren't in our main categories
    echo "$ERRORS" | grep -v "Cannot find module" | \
                     grep -v "does not exist on type" | \
                     grep -v "implicitly has an 'any' type" | \
                     grep -v "has no exported member" | \
                     grep -v "is not callable" | head -20
    
    echo ""
    echo "🤖 NEXT STEP FOR AI:"
    echo "   Review typescript-errors.log for complete error details"
    echo "   These errors require case-by-case analysis and fixes"
    echo ""
else
    echo "✅ All $TOTAL_ERRORS error(s) are categorized above"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 1
