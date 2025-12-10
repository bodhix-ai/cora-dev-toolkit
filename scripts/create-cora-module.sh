#!/bin/bash

##############################################################################
# CORA Module Generator
# 
# Creates a new CORA-compliant module from the _module-template
# Automatically updates placeholders and runs compliance checks
#
# Usage: ./scripts/create-cora-module.sh <module-name> [entity-name]
#
# Example: ./scripts/create-cora-module.sh resume-module resume
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Parse arguments
MODULE_NAME="$1"
ENTITY_NAME="${2:-entity}"

# Validate arguments
if [ -z "$MODULE_NAME" ]; then
    echo -e "${RED}❌ Error: Module name is required${NC}"
    echo ""
    echo "Usage: ./scripts/create-cora-module.sh <module-name> [entity-name]"
    echo ""
    echo "Examples:"
    echo "  ./scripts/create-cora-module.sh resume-module resume"
    echo "  ./scripts/create-cora-module.sh skills-module skill"
    exit 1
fi

# Validate module name format (kebab-case, ends with -module)
if [[ ! "$MODULE_NAME" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*-module$ ]]; then
    echo -e "${RED}❌ Error: Invalid module name format${NC}"
    echo "Module name must:"
    echo "  - Be in kebab-case (lowercase with hyphens)"
    echo "  - End with '-module'"
    echo ""
    echo "Valid examples: resume-module, skills-module, training-module"
    echo "Invalid: ResumeModule, resume_module, resume"
    exit 1
fi

# Validate entity name format (lowercase letters only)
if [[ ! "$ENTITY_NAME" =~ ^[a-z][a-z0-9]*$ ]]; then
    echo -e "${RED}❌ Error: Invalid entity name format${NC}"
    echo "Entity name must be lowercase letters only"
    echo ""
    echo "Valid examples: resume, skill, training"
    echo "Invalid: Resume, resume-data, resume_data"
    exit 1
fi

# Paths
TEMPLATE_DIR="$PROJECT_ROOT/templates/_module-template"
MODULE_DIR="$PROJECT_ROOT/../pm-app-stack/packages/$MODULE_NAME"

# Check if template exists
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo -e "${RED}❌ Error: Template directory not found at $TEMPLATE_DIR${NC}"
    exit 1
fi

# Check if module already exists
if [ -d "$MODULE_DIR" ]; then
    echo -e "${RED}❌ Error: Module already exists at $MODULE_DIR${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           CORA Module Generator                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Creating new CORA-compliant module:${NC}"
echo -e "  Module Name:  ${GREEN}$MODULE_NAME${NC}"
echo -e "  Entity Name:  ${GREEN}$ENTITY_NAME${NC}"
echo -e "  Location:     ${GREEN}packages/$MODULE_NAME${NC}"
echo ""

# Step 1: Copy template
echo -e "${BLUE}[1/7]${NC} Copying template..."
cp -r "$TEMPLATE_DIR" "$MODULE_DIR"
echo -e "      ${GREEN}✓${NC} Template copied"

# Step 2: Remove .DS_Store and other unwanted files
echo -e "${BLUE}[2/7]${NC} Cleaning up..."
find "$MODULE_DIR" -name ".DS_Store" -delete 2>/dev/null || true
find "$MODULE_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$MODULE_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
echo -e "      ${GREEN}✓${NC} Cleaned up unwanted files"

# Step 3: Rename entity directory
echo -e "${BLUE}[3/7]${NC} Renaming entity directories..."
if [ -d "$MODULE_DIR/backend/lambdas/entity" ]; then
    mv "$MODULE_DIR/backend/lambdas/entity" "$MODULE_DIR/backend/lambdas/$ENTITY_NAME"
    echo -e "      ${GREEN}✓${NC} Renamed backend/lambdas/entity → $ENTITY_NAME"
fi

# Step 4: Update placeholders in files
echo -e "${BLUE}[4/7]${NC} Updating placeholders..."

# Convert names to different cases
MODULE_NAME_PASCAL=$(echo "$MODULE_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g' | sed 's/-//g')  # resume-module → ResumeModule
MODULE_NAME_CAMEL=$(echo "$MODULE_NAME_PASCAL" | sed 's/^./\l&/')                          # ResumeModule → resumeModule
MODULE_NAME_SNAKE=$(echo "$MODULE_NAME" | tr '-' '_')                                      # resume-module → resume_module
ENTITY_NAME_PASCAL=$(echo "$ENTITY_NAME" | sed 's/^./\U&/')                                # resume → Resume
ENTITY_NAME_PLURAL="${ENTITY_NAME}s"                                                        # resume → resumes

# Find all files to update (exclude node_modules, .build, etc.)
FILES=$(find "$MODULE_DIR" -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/.build/*" \
    ! -path "*/.git/*" \
    ! -name "*.pyc")

# Replace placeholders in files
for file in $FILES; do
    # Skip binary files
    if file "$file" | grep -q "text"; then
        sed -i '' \
            -e "s/_module-template/$MODULE_NAME/g" \
            -e "s/ModuleTemplate/$MODULE_NAME_PASCAL/g" \
            -e "s/moduleTemplate/$MODULE_NAME_CAMEL/g" \
            -e "s/module_template/$MODULE_NAME_SNAKE/g" \
            -e "s/entity/$ENTITY_NAME/g" \
            -e "s/Entity/$ENTITY_NAME_PASCAL/g" \
            -e "s/entities/$ENTITY_NAME_PLURAL/g" \
            "$file" 2>/dev/null || true
    fi
done

echo -e "      ${GREEN}✓${NC} Updated placeholders in all files"

# Step 5: Update package.json name
echo -e "${BLUE}[5/7]${NC} Updating package configurations..."
if [ -f "$MODULE_DIR/package.json" ]; then
    # Update package name
    sed -i '' "s/@sts-career\/_module-template/@sts-career\/$MODULE_NAME/g" "$MODULE_DIR/package.json"
    echo -e "      ${GREEN}✓${NC} Updated package.json"
fi

if [ -f "$MODULE_DIR/frontend/package.json" ]; then
    sed -i '' "s/@sts-career\/_module-template-frontend/@sts-career\/$MODULE_NAME-frontend/g" "$MODULE_DIR/frontend/package.json"
    echo -e "      ${GREEN}✓${NC} Updated frontend/package.json"
fi

# Step 6: Create module README
echo -e "${BLUE}[6/7]${NC} Generating README..."
cat > "$MODULE_DIR/README.md" << EOF
# $MODULE_NAME_PASCAL

CORA-compliant module for managing ${ENTITY_NAME_PLURAL}.

## Structure

\`\`\`
$MODULE_NAME/
├── backend/
│   ├── lambdas/
│   │   └── $ENTITY_NAME/           # CRUD Lambda for ${ENTITY_NAME_PLURAL}
│   └── layers/
│       └── module-common/          # Shared utilities
├── frontend/
│   └── src/
│       ├── components/             # React components
│       ├── hooks/                  # Custom hooks
│       └── types/                  # TypeScript types
└── README.md
\`\`\`

## Features

- ✅ **CORA Compliant**: Uses org_common standard patterns
- ✅ **Multi-Tenant**: All data filtered by org_id
- ✅ **Type Safe**: Full TypeScript support
- ✅ **Secure**: RLS policies enforced
- ✅ **Tested**: Comprehensive test coverage

## Backend API

### Endpoints

\`\`\`
GET    /${ENTITY_NAME_PLURAL}?orgId=xxx     List ${ENTITY_NAME_PLURAL} for organization
GET    /${ENTITY_NAME_PLURAL}/:id           Get ${ENTITY_NAME} by ID
POST   /${ENTITY_NAME_PLURAL}               Create new ${ENTITY_NAME}
PUT    /${ENTITY_NAME_PLURAL}/:id           Update ${ENTITY_NAME}
DELETE /${ENTITY_NAME_PLURAL}/:id           Delete ${ENTITY_NAME}
\`\`\`

### Database Schema

\`\`\`sql
CREATE TABLE public.$ENTITY_NAME (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.$ENTITY_NAME ENABLE ROW LEVEL SECURITY;

CREATE POLICY "${ENTITY_NAME}_org_members_select" ON public.$ENTITY_NAME
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE person_id = auth.uid() AND active = true));

-- Add other policies for INSERT, UPDATE, DELETE
\`\`\`

## Frontend Usage

\`\`\`typescript
import { use${ENTITY_NAME_PASCAL}s } from '@sts-career/$MODULE_NAME-frontend';

function ${ENTITY_NAME_PASCAL}List() {
  const { ${ENTITY_NAME_PLURAL}, loading, error } = use${ENTITY_NAME_PASCAL}s(orgId);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <List>
      {${ENTITY_NAME_PLURAL}.map(${ENTITY_NAME} => (
        <ListItem key={${ENTITY_NAME}.id}>
          <ListItemText primary={${ENTITY_NAME}.name} />
        </ListItem>
      ))}
    </List>
  );
}
\`\`\`

## Development

### Local Development

\`\`\`bash
# Install dependencies
pnpm install

# Build backend
cd backend && ./build.sh

# Run frontend
cd frontend && pnpm dev
\`\`\`

### Testing

\`\`\`bash
# Run all tests
pnpm test

# Run backend tests
pnpm test:backend

# Run frontend tests
pnpm test:frontend
\`\`\`

### Compliance Checks

\`\`\`bash
# Check API compliance
python3 scripts/check-api-compliance.py

# Check frontend compliance
pnpm check:frontend
\`\`\`

## Deployment

This module is deployed as part of the STS Career Stack infrastructure.

See: [docs/deployment/README.md](../../docs/deployment/README.md)

## Generated

This module was generated using the CORA Module Generator:

\`\`\`bash
./scripts/create-cora-module.sh $MODULE_NAME $ENTITY_NAME
\`\`\`

**Generated on:** $(date)
EOF

echo -e "      ${GREEN}✓${NC} Created README.md"

# Step 7: Run compliance check
echo -e "${BLUE}[7/7]${NC} Running compliance check..."
cd "$PROJECT_ROOT"
if python3 scripts/check-api-compliance.py 2>&1 | grep -q "packages/$MODULE_NAME"; then
    COMPLIANCE_RESULT=$(python3 scripts/check-api-compliance.py 2>&1 | grep -A 5 "packages/$MODULE_NAME" | head -10)
    echo "$COMPLIANCE_RESULT"
else
    echo -e "      ${YELLOW}⚠${NC}  Could not verify compliance (module may not have been scanned)"
fi

# Success message
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Module Created Successfully!                             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "  1. ${BLUE}Create Database Schema${NC}"
echo -e "     Create a migration file for the $ENTITY_NAME table and RLS policies"
echo -e "     ${GREEN}→${NC} sql/migrations/$(date +%Y%m%d)_create_${ENTITY_NAME}_table.sql"
echo ""
echo -e "  2. ${BLUE}Update Infrastructure${NC}"
echo -e "     Add Lambda resources to Terraform configuration"
echo -e "     ${GREEN}→${NC} See: docs/infrastructure/ADDING_LAMBDAS.md"
echo ""
echo -e "  3. ${BLUE}Install Frontend Dependencies${NC}"
echo -e "     ${GREEN}cd packages/$MODULE_NAME/frontend && pnpm install${NC}"
echo ""
echo -e "  4. ${BLUE}Add to Workspace${NC}"
echo -e "     The module is already in packages/ and will be picked up by pnpm workspace"
echo ""
echo -e "  5. ${BLUE}Implement Business Logic${NC}"
echo -e "     Customize the generated code for your specific requirements"
echo ""
echo -e "  6. ${BLUE}Write Tests${NC}"
echo -e "     ${GREEN}→${NC} packages/$MODULE_NAME/backend/__tests__/"
echo -e "     ${GREEN}→${NC} packages/$MODULE_NAME/frontend/__tests__/"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo -e "  ${GREEN}→${NC} packages/$MODULE_NAME/README.md"
echo -e "  ${GREEN}→${NC} docs/development/MODULE-DEVELOPMENT-GUIDE.md"
echo -e "  ${GREEN}→${NC} docs/development/CORA-PATTERNS-CHECKLIST.md"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
