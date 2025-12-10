# CORA Module Development Toolkit - Integration Guide

## Overview

This guide walks you through integrating the CORA Module Development Toolkit into your AI module project, setting up the environment, and creating your first CORA-compliant modules.

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Python 3.8+ installed (`python3 --version`)
- [ ] Git installed and configured
- [ ] AWS CLI installed (optional, for infrastructure checks)
- [ ] Access to AWS credentials (optional, for full compliance checks)
- [ ] Access to Supabase credentials (optional, for database checks)

## Integration Steps

### Step 1: Prepare Your AI Module Project

Your project should have this structure (or you'll create it):

```
your-ai-module-project/
├── packages/              # Will contain your modules
├── apps/                  # Your applications
│   └── frontend/          # Next.js frontend app
├── package.json           # Root package.json with workspace config
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── tsconfig.base.json     # Base TypeScript configuration
```

If you don't have this structure yet, create it:

```bash
# From your project root
mkdir -p packages apps/frontend
```

### Step 2: Copy Toolkit to Your Project

```bash
# From wherever you have the toolkit
cp -r module-development-toolkit /path/to/your-ai-module-project/

# Navigate to your project
cd /path/to/your-ai-module-project
```

### Step 3: Install Dependencies

#### Python Dependencies

```bash
cd module-development-toolkit/config
pip install -r requirements.txt
cd ../..
```

Or if you prefer a virtual environment:

```bash
cd module-development-toolkit/config
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

#### Node.js Dependencies

```bash
# If you haven't already, install pnpm globally
npm install -g pnpm

# Install project dependencies
pnpm install
```

### Step 4: Make Scripts Executable

```bash
chmod +x module-development-toolkit/scripts/*.sh
```

### Step 5: Configure Environment Variables

Create a `.env.local` or `.env` file in your project root:

```bash
# .env.local
# AWS Credentials (optional, for infrastructure checks)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1

# Supabase Credentials (optional, for database checks)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Compliance thresholds (optional)
CORA_FRONTEND_THRESHOLD=95
CORA_BACKEND_THRESHOLD=90
```

**Important:** Add `.env.local` to your `.gitignore`!

### Step 6: Verify Toolkit Installation

```bash
# Test that scripts are accessible
./module-development-toolkit/scripts/create-cora-module.sh --help

# Test Python environment
python3 -c "import boto3, supabase; print('Python dependencies OK')"
```

## Creating Your First Module: ai-enablement

### Step 1: Generate the Module

```bash
# From project root
./module-development-toolkit/scripts/create-cora-module.sh ai-enablement
```

This will:
1. Create `packages/ai-enablement/` directory
2. Copy template files
3. Replace all placeholders with "ai-enablement"
4. Update package.json with correct module name
5. Create CORA-compliant structure

Expected output:
```
✓ Creating module: ai-enablement
✓ Copying template files...
✓ Replacing placeholders...
✓ Updating package.json...
✓ Module created successfully!

Next steps:
1. cd packages/ai-enablement
2. Review and customize the generated code
3. Run: pnpm install
4. Start development!
```

### Step 2: Install Module Dependencies

```bash
cd packages/ai-enablement
pnpm install
cd ../..
```

### Step 3: Verify Module Structure

Your new module should look like:

```
packages/ai-enablement/
├── backend/
│   ├── lambdas/
│   │   ├── ai_enablement_create.py
│   │   ├── ai_enablement_read.py
│   │   ├── ai_enablement_update.py
│   │   ├── ai_enablement_delete.py
│   │   └── ai_enablement_list.py
│   └── types/
│       └── ai_enablement_types.py
├── frontend/
│   ├── components/
│   │   ├── AiEnablementList.tsx
│   │   ├── AiEnablementDetail.tsx
│   │   └── AiEnablementForm.tsx
│   ├── hooks/
│   │   └── useAiEnablementData.ts
│   ├── api/
│   │   └── aiEnablementApi.ts
│   ├── types/
│   │   └── index.ts
│   ├── navigation/
│   │   └── aiEnablementNavConfig.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Step 4: Run Initial Compliance Check

```bash
# Check frontend compliance
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts ai-enablement

# Check backend compliance (if you have AWS/Supabase configured)
python3 module-development-toolkit/scripts/check-cora-compliance.py --module ai-enablement
```

Expected result: **95%+ frontend compliance**, **90%+ backend compliance**

### Step 5: Customize for AI Enablement

Now customize the template for your AI enablement needs:

1. **Update Types** (`frontend/types/index.ts` and `backend/types/ai_enablement_types.py`):
   - Define AI configuration interfaces
   - Add AI model settings types
   - Include prompt templates types

2. **Implement Backend** (`backend/lambdas/`):
   - Add AI-specific business logic
   - Integrate with AI services
   - Implement security checks

3. **Implement Frontend** (`frontend/components/`):
   - Build AI configuration UI
   - Create prompt management interface
   - Add AI response display components

4. **Update Navigation** (`frontend/navigation/aiEnablementNavConfig.ts`):
   - Configure menu items
   - Set up routes
   - Define permissions

## Creating Your Second Module: ai-config

```bash
# From project root
./module-development-toolkit/scripts/create-cora-module.sh ai-config

cd packages/ai-config
pnpm install
cd ../..

# Verify compliance
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts ai-config
```

Customize for AI configuration management following the same pattern as ai-enablement.

## Workspace Configuration

### Update pnpm-workspace.yaml

Ensure your `pnpm-workspace.yaml` includes the new modules:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Update Root package.json

Add workspace dependencies if needed:

```json
{
  "name": "ai-module-project",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter frontend dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "type-check": "pnpm -r type-check",
    "compliance-check": "python3 module-development-toolkit/scripts/check-cora-compliance.py"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  }
}
```

## Integrating ESLint Rules

### Copy ESLint Configs to Project Root

```bash
cp module-development-toolkit/config/.eslintrc.cora-auth.js .
cp module-development-toolkit/config/.eslintrc.cora-nav.js .
```

### Update Your .eslintrc.js or eslint.config.js

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    // Your existing configs
    './.eslintrc.cora-auth.js',
    './.eslintrc.cora-nav.js'
  ],
  // Your other rules...
};
```

## Setting Up Pre-commit Hooks

### Option 1: Git Hooks (Simple)

```bash
# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
./module-development-toolkit/scripts/pre-commit-check.sh
EOF

chmod +x .git/hooks/pre-commit
```

### Option 2: Husky (Recommended)

```bash
pnpm add -D husky lint-staged

# Initialize husky
npx husky install

# Create pre-commit hook
npx husky add .git/hooks/pre-commit "pnpm lint-staged"
```

Update `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "./module-development-toolkit/scripts/type-check-staged.sh",
      "eslint --fix"
    ],
    "*.{py}": [
      "black",
      "flake8"
    ]
  }
}
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/cora-compliance.yml`:

```yaml
name: CORA Compliance Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  compliance:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install Node.js dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Install Python dependencies
        run: pip install -r module-development-toolkit/config/requirements.txt
      
      - name: TypeScript type checking
        run: pnpm -r type-check
      
      - name: ESLint
        run: pnpm -r lint
      
      - name: Frontend CORA Compliance
        run: npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts
      
      - name: Backend CORA Compliance
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: python3 module-development-toolkit/scripts/check-cora-compliance.py
      
      - name: Upload compliance report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: compliance-report
          path: compliance-report.json
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - install
  - check
  - test

variables:
  PNPM_VERSION: "8.6.0"

install:
  stage: install
  image: node:18
  script:
    - npm install -g pnpm@${PNPM_VERSION}
    - pnpm install --frozen-lockfile
  artifacts:
    paths:
      - node_modules/
      - packages/*/node_modules/
    expire_in: 1 hour

compliance:frontend:
  stage: check
  image: node:18
  dependencies:
    - install
  script:
    - npm install -g pnpm@${PNPM_VERSION}
    - npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts
  allow_failure: false

compliance:backend:
  stage: check
  image: python:3.11
  dependencies:
    - install
  script:
    - pip install -r module-development-toolkit/config/requirements.txt
    - python3 module-development-toolkit/scripts/check-cora-compliance.py --skip-infra
  allow_failure: false
```

## Path Adjustments

### If Your Project Structure Differs

If your project has a different structure, you may need to adjust paths in scripts:

#### For create-cora-module.sh

Edit `module-development-toolkit/scripts/create-cora-module.sh`:

```bash
# Change this line if packages/ is in a different location
PACKAGES_DIR="packages"  # Adjust if needed
```

#### For Compliance Scripts

Edit path references in:
- `check-cora-compliance.py`
- `check-frontend-compliance.ts`
- `check-api-compliance.py`

Look for hardcoded paths like:
```python
PACKAGES_DIR = "packages"  # Adjust this
BACKEND_DIR = "backend/lambdas"  # Adjust this
```

## Testing Your Integration

### Complete Integration Test

Run these commands to verify everything works:

```bash
# 1. Create test module
./module-development-toolkit/scripts/create-cora-module.sh test-module

# 2. Install dependencies
cd packages/test-module && pnpm install && cd ../..

# 3. Run compliance checks
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts test-module
python3 module-development-toolkit/scripts/check-cora-compliance.py --module test-module --skip-infra

# 4. Type check
cd packages/test-module && pnpm type-check && cd ../..

# 5. Lint
cd packages/test-module && pnpm lint && cd ../..

# 6. Clean up test module (if satisfied)
rm -rf packages/test-module
```

Expected results:
- ✅ Module created successfully
- ✅ Dependencies installed without errors
- ✅ Frontend compliance: 95%+
- ✅ Backend compliance: 90%+
- ✅ No TypeScript errors
- ✅ No lint errors

## Common Integration Issues

### Issue 1: Module Creation Fails - "packages/ directory not found"

**Solution:**
```bash
mkdir -p packages
```

### Issue 2: Python Dependencies Installation Fails

**Solution:**
```bash
# Use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r module-development-toolkit/config/requirements.txt
```

### Issue 3: TypeScript Can't Find Module Dependencies

**Solution:**
```bash
# From project root
pnpm install
pnpm -r build  # Build all packages in order
```

### Issue 4: ESLint Rules Not Being Applied

**Solution:**
```bash
# Ensure ESLint configs are in project root
cp module-development-toolkit/config/.eslintrc.cora-*.js .

# Update your ESLint config to extend them
# Clear ESLint cache
rm -rf node_modules/.cache/eslint
```

### Issue 5: Compliance Scripts Can't Find AWS/Supabase

**Solution:**
```bash
# Skip infrastructure checks during initial setup
python3 module-development-toolkit/scripts/check-cora-compliance.py --skip-infra

# Or set environment variable
export SKIP_INFRA_CHECKS=true
```

## Next Steps After Integration

### 1. Develop Your Modules

- **ai-enablement**: AI service integration and configuration
- **ai-config**: AI model and prompt management

### 2. Maintain CORA Compliance

Run compliance checks frequently:
```bash
# Quick check
./module-development-toolkit/scripts/pre-commit-check.sh

# Full check
python3 module-development-toolkit/scripts/check-cora-compliance.py
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts
```

### 3. Import Modules into STS Career Stack

Once your AI modules are complete and CORA-compliant:

1. **Package modules for transfer:**
   ```bash
   # Create tarball of completed modules
   tar -czf ai-modules.tar.gz packages/ai-enablement packages/ai-config
   ```

2. **Transfer to STS Career Stack:**
   ```bash
   # In STS Career Stack project
   tar -xzf ai-modules.tar.gz
   pnpm install
   ```

3. **Integrate into main app:**
   - Update navigation in frontend app
   - Configure API endpoints
   - Add infrastructure definitions
   - Run full compliance check

4. **Verify integration:**
   ```bash
   cd sts-career-stack
   python3 scripts/check-cora-compliance.py
   npx ts-node scripts/check-frontend-compliance.ts
   ```

### 4. Documentation

Document your modules:
- Update module README.md files
- Document AI configuration options
- Create user guides
- Add API documentation
- Document integration points

## Support and Help

### Documentation References

- **Toolkit README**: `module-development-toolkit/README.md`
- **CORA Standards**: `module-development-toolkit/docs/CORA-FRONTEND-STANDARDS.md`
- **Compliance Scripts**: `module-development-toolkit/docs/README-CORA-COMPLIANCE.md`
- **Lessons Learned**: `module-development-toolkit/docs/CORA-COMPLIANCE-REMEDIATION-LOG.md`

### Learning from Examples

Study the module template:
```bash
# Explore template structure
cd module-development-toolkit/templates/_module-template
# Review each file to understand patterns
```

### Troubleshooting Commands

```bash
# Verify Node.js and pnpm
node --version && pnpm --version

# Verify Python and packages
python3 --version && pip list | grep -E "(boto3|supabase)"

# List all packages
pnpm list --depth 0

# Check workspace structure
pnpm list -r

# Rebuild everything
pnpm -r clean && pnpm -r build

# Check Git hooks
ls -la .git/hooks/
```

## Integration Checklist

Use this checklist to track your integration progress:

- [ ] Project structure created (packages/, apps/)
- [ ] Toolkit copied to project
- [ ] Python dependencies installed
- [ ] Node.js dependencies installed
- [ ] Scripts made executable
- [ ] Environment variables configured
- [ ] Created ai-enablement module
- [ ] Created ai-config module
- [ ] Ran compliance checks on both modules
- [ ] ESLint rules integrated
- [ ] Pre-commit hooks configured
- [ ] CI/CD pipeline configured
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Team trained on toolkit usage
- [ ] Ready to develop AI features!

## Success Criteria

Your integration is complete when:

1. ✅ Both modules created successfully
2. ✅ Frontend compliance: 95%+
3. ✅ Backend compliance: 90%+
4. ✅ No TypeScript errors
5. ✅ No ESLint errors
6. ✅ Pre-commit hooks working
7. ✅ CI/CD pipeline passing
8. ✅ Team can create new modules independently

## Timeline Estimate

- **Basic Integration**: 1-2 hours
- **Full Integration with CI/CD**: 3-4 hours
- **Team Training**: 1-2 hours
- **Total**: 5-8 hours

## Conclusion

You now have a fully integrated CORA Module Development Toolkit! You can:

- Create new CORA-compliant modules in minutes
- Validate compliance automatically
- Maintain high code quality standards
- Develop AI modules that seamlessly integrate with STS Career Stack

Start developing your AI enablement and AI config modules, and reach out if you encounter any issues!
