# Guide: Investigating Validation Errors Systematically

**Category:** Troubleshooting Methodology  
**Audience:** AI Agents & Developers  
**Created:** 2026-01-19  
**Based on:** Validation Remediation Phase 1.2 Investigation

## Overview

This guide documents a systematic methodology for investigating validation errors that led to a **98% error reduction** by discovering the plan's assumptions were incorrect and finding the actual root cause.

## The Key Lesson

**🎯 ALWAYS VERIFY FACTS BEFORE ASSUMING**

Plans and assumptions can be wrong. Investigation reveals truth.

## Case Study: Phase 1.2 Investigation

### The Plan Said
- "Fix ~500 route import paths"
- Assumed imports like `../../../frontend` were wrong
- Estimated 1-2 days of work editing imports

### The Reality
- Route imports were **already correct** using `@{{PROJECT_NAME}}/` pattern
- Actual issue: Missing `tsconfig.json` files prevented module builds
- Solution: Create 2 config files (20 lines total)
- **Impact:** 2,105 errors eliminated (98% reduction!)

### Time Saved
- Estimated: 1-2 days editing 500+ imports
- Actual: 30 minutes creating 2 config files
- **Saved ~95% of estimated time by investigating first!**

## The Investigation Methodology

### Step 1: Question the Plan

**Before blindly following a plan, ask:**
- Is this assumption based on facts or guesses?
- What evidence supports this approach?
- Has anyone verified this is the actual issue?

**Example:**
```
Plan says: "Fix route import paths"
Question: Are the imports actually wrong?
Action: Search templates for the problematic pattern
Result: 0 matches found → imports are correct!
```

### Step 2: Examine Actual Errors

**Don't rely on summaries - look at the raw errors:**

```bash
# Run validation and examine actual error messages
cd test-project
python3 cora-validate.py project . --validators typescript
```

**Look for patterns in errors:**
- Are they all the same error?
- What's the FIRST error that appears?
- Are these code errors or configuration errors?

**Example from this session:**
```
"Cannot find module '@ai-sec/module-access' or its corresponding type declarations."
```

This isn't an import path issue - it's a "module not found" issue!

### Step 3: Search for Expected Issues

**If the plan says "Fix pattern X", search for pattern X first:**

```bash
# Search for the problematic pattern mentioned in plan
search_files templates/_modules-core "from ['\"]\\.\\./(\\.\\./)+(frontend|backend)"
```

**If you find 0 results:**
- ✅ The issue described in the plan doesn't exist!
- ❌ Following the plan will waste time
- 🎯 Need to find the ACTUAL issue

### Step 4: Verify Assumptions by Example

**Pick a specific example and verify the assumption:**

```bash
# Plan says route imports are wrong
# Check a specific route file to verify
cat templates/_modules-core/module-kb/routes/admin/org/kb/page.tsx | grep "import"
```

**Result:**
```typescript
import { useUser } from '@{{PROJECT_NAME}}/module-access';  // ✅ CORRECT!
```

Assumption disproven → Look elsewhere for the issue.

### Step 5: Trace the Error to Root Cause

**"Cannot find module" errors have a few common causes:**

1. **Missing dependency** → Check package.json
2. **Module not built** → Check for dist/ folder
3. **Wrong import path** → Check actual imports
4. **Missing tsconfig.json** → Check build configuration

**Follow the chain:**
```bash
# Check if module has dist/ folder
ls -la packages/module-access/dist
# Result: No such file or directory

# Why no dist/? Try building
cd packages/module-access && pnpm build
# Result: error TS5083: Cannot read file 'tsconfig.json'

# Found it! Missing tsconfig.json
```

### Step 6: Find the Pattern

**Once you identify the issue in one place, check if it's systemic:**

```bash
# Find all modules with the same issue
find templates/_modules-* -name "frontend" -type d -exec test -f {}/tsconfig.json \; -print

# Result shows which modules are missing tsconfig.json
```

**This reveals:**
- Scope of the problem
- Whether it's a systematic issue
- If a standard or template is missing

### Step 7: Apply Simplest Solution

**Ask: What's the SIMPLEST fix?**

Options considered:
1. ❌ Edit 500+ import statements (plan's approach)
2. ❌ Restructure module directories
3. ❌ Change build system
4. ✅ **Create 2 missing config files (20 lines total)**

Always choose the simplest solution that addresses the root cause.

## Investigation Checklist

Use this checklist when investigating validation errors:

```
[ ] Read the plan/assumption
[ ] Question: Is this based on facts?
[ ] Search for the issue the plan describes
[ ] If found 0 results: The plan is wrong!
[ ] Examine actual error messages
[ ] Pick a specific example to verify
[ ] Trace error to root cause (not just symptom)
[ ] Check if issue is systemic (find pattern)
[ ] Identify simplest solution
[ ] Document findings for future reference
```

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Assume the Plan is Correct

```
Plan: "Fix 500 imports"
Developer: *starts editing imports without checking*
Result: Wasted time, issue not fixed
```

### ✅ Correct Pattern: Verify First

```
Plan: "Fix 500 imports"
Developer: *searches for problematic imports*
Finds: 0 results
Developer: *investigates actual errors*
Result: Found real issue (config files), fixed in 30min
```

### ❌ Anti-Pattern 2: Fix Symptoms, Not Root Causes

```
Error: "Cannot find module"
Developer: *adds node_modules to git*
Result: Symptom hidden, root cause persists
```

### ✅ Correct Pattern: Trace to Root

```
Error: "Cannot find module"
Developer: Why can't it find the module?
         → Module not built
         → Why not built?
         → Missing tsconfig.json
         → Add tsconfig.json
Result: Root cause fixed, error eliminated
```

### ❌ Anti-Pattern 3: Complex Solutions First

```
Issue: TypeScript errors
Developer: *rewrites entire module structure*
Result: Weeks of work, may not fix issue
```

### ✅ Correct Pattern: Simplest Solution First

```
Issue: TypeScript errors
Developer: What's the simplest fix?
         → Missing config file
         → Create file (2 minutes)
Result: Issue fixed immediately
```

## Build vs. Validate Order

**🎯 KEY INSIGHT: You must BUILD before you can VALIDATE!**

### The Dependency Chain

```
1. Source Code (.ts, .tsx)
   ↓
2. Build Configuration (tsconfig.json) ← REQUIRED!
   ↓
3. Build Process (tsc)
   ↓
4. Compiled Output (dist/)
   ↓
5. TypeScript Validation (type-check)
```

**If step 2 is missing:**
- Step 3 fails (cannot build)
- Step 4 never happens (no dist/)
- Step 5 produces "Cannot find module" errors

**The Fix:**
- Add missing build configuration
- Build succeeds
- Validation can now run properly

## Investigation Tools

### For TypeScript Errors

```bash
# Check if modules can be built
cd packages/module-{name}
pnpm build

# Check what errors prevent building
pnpm build 2>&1 | head -20

# Check if tsconfig.json exists
find packages/ -name "tsconfig.json"

# Check if modules have dist/ folders
find packages/ -name "dist" -type d
```

### For Import Issues

```bash
# Search for specific import patterns
search_files packages/ "from ['\"]@{project}"

# Check if imports use correct format
grep -r "import.*from" packages/module-*/routes/

# Verify package.json exports
cat packages/module-{name}/package.json | jq .exports
```

### For Configuration Issues

```bash
# Check tsconfig extends chain
cat tsconfig.json
cat packages/module-{name}/tsconfig.json

# Verify build scripts
cat package.json | jq .scripts.build

# Check for common config files
ls -la {tsconfig,package,turbo}.json
```

## Templates vs. Generated Projects

**🎯 KEY INSIGHT: Missing files in templates propagate to ALL projects!**

### The Template-First Rule

1. **Always fix templates FIRST**
   - Templates are the source of truth
   - Generated projects inherit template issues
   - Fixing templates prevents future issues

2. **Then sync to test projects**
   - Use sync scripts or manual copy
   - Test the fix in generated project
   - Verify solution works

3. **Never fix only test projects**
   - Test projects are temporary
   - Fixes don't persist to templates
   - Next project generation brings bug back

### Validation of Templates

```bash
# Check if all modules have required files
find templates/_modules-* -type d -name "frontend" \
  -exec test -f {}/tsconfig.json \; -print

# Validate template completeness
# (Should create automated validator for this)
```

## Continuous Improvement: Fixing Validators

**🎯 KEY INSIGHT: Validators themselves need validation and improvement!**

### When to Update Validators

Update validators when you discover:
1. **False Positives** - Validator reports error when code is correct
2. **False Negatives** - Validator misses actual errors
3. **New Patterns** - Discover new issues that should be caught
4. **Edge Cases** - Validator doesn't handle certain situations

### Example from This Session

**Discovery:** Modules need tsconfig.json files to be buildable

**Validator Gap:** No validator checks for this requirement!

**Result:** Missing files caused 2,105 errors in test project

**Fix:** Create new validator (see "Creating New Validators" below)

### Fixing False Positives

**Example: Portability Validator flagging acceptable fallbacks**

```python
# validation/portability-validator/cli.py

# BEFORE (False Positive):
if "us-east-1" in line:
    errors.append("Hardcoded region found")

# AFTER (More Accurate):
if "'us-east-1'" in line and "os.environ.get" not in context:
    # Only flag if NOT using environment variable pattern
    errors.append("Hardcoded region without env var fallback")
else:
    # This is acceptable: os.environ.get('AWS_REGION', 'us-east-1')
    warnings.append("Region fallback used (acceptable)")
```

**Pattern:**
1. Identify the false positive case
2. Determine why it's actually acceptable
3. Update validator logic to distinguish acceptable from unacceptable
4. Convert error to warning if pattern is acceptable with caveats

### Fixing False Negatives

**Example: Validator missing template placeholder formats**

```python
# validation/portability-validator/cli.py

# BEFORE (Missed Issues):
patterns = [
    r'\$\{project\}',  # Checks for ${project}
]

# AFTER (Catches More):
patterns = [
    r'\$\{project\}',          # ${project} - wrong
    r'\{project\}',            # {project} - wrong  
    r'@\{project\}/',          # @{project}/ - wrong
    r'pm-app',                 # Hardcoded project name
    # Correct pattern is: {{PROJECT_NAME}}
]
```

**Pattern:**
1. Identify what the validator missed
2. Determine the pattern that should trigger detection
3. Add pattern to validator regex/logic
4. Test validator against known cases
5. Document the new pattern in validator README

### Validator Improvement Checklist

When updating validators:
```
[ ] Identified false positive/negative
[ ] Determined correct behavior
[ ] Updated validator logic
[ ] Tested against known good cases
[ ] Tested against known bad cases
[ ] Updated validator documentation
[ ] Added test cases for regression prevention
[ ] Committed changes with descriptive message
```

## Creating New Validators

**🎯 PROACTIVE VALIDATION: Catch issues before users experience them!**

### When to Create New Validators

Create a new validator when:
1. **Pattern emerges** - Same issue found multiple times
2. **Standard established** - New requirement for all modules/projects
3. **Critical failure** - Issue caused significant problems
4. **Best practice** - Want to enforce a standard pattern
5. **Time sink** - Issue wastes developer time when it occurs

### Example: tsconfig.json Validator

**Trigger:** Discovered all modules need tsconfig.json (2,105 errors!)

**Solution:** Create validator to catch this proactively

### Steps to Create a Validator

#### 1. Define the Validation Rule

```markdown
## Rule
All CORA module frontends MUST have a tsconfig.json file.

## Why
- Enables TypeScript compilation
- Required for module builds
- Prevents "Cannot find module" errors

## How to Check
Check if file exists: {module}/frontend/tsconfig.json
```

#### 2. Create Validator Structure

```bash
mkdir -p validation/build-config-validator
cd validation/build-config-validator
touch cli.py README.md
```

#### 3. Implement Validator Logic

```python
#!/usr/bin/env python3
"""
CORA Build Configuration Validator

Checks that all modules have required build configuration files.
"""

import os
import sys
from pathlib import Path

def validate_build_configs(project_path):
    """Check all modules have tsconfig.json in frontend/"""
    errors = []
    warnings = []
    
    # Find all module directories
    modules_path = Path(project_path) / "packages"
    if not modules_path.exists():
        return {"errors": ["packages/ directory not found"], "warnings": []}
    
    for module_dir in modules_path.iterdir():
        if not module_dir.is_dir():
            continue
        if not module_dir.name.startswith("module-"):
            continue
            
        # Check for frontend directory
        frontend_dir = module_dir / "frontend"
        if not frontend_dir.exists():
            continue  # No frontend, no requirement
            
        # Check for tsconfig.json
        tsconfig_path = frontend_dir / "tsconfig.json"
        if not tsconfig_path.exists():
            errors.append({
                "file": str(frontend_dir.relative_to(project_path)),
                "message": f"Missing tsconfig.json in {module_dir.name}/frontend",
                "severity": "error"
            })
        else:
            # Optionally validate tsconfig content
            validate_tsconfig_content(tsconfig_path, warnings)
    
    return {"errors": errors, "warnings": warnings}

def validate_tsconfig_content(tsconfig_path, warnings):
    """Validate tsconfig.json has required fields"""
    import json
    
    with open(tsconfig_path) as f:
        config = json.load(f)
    
    # Check for required fields
    if "extends" not in config:
        warnings.append(f"{tsconfig_path}: Missing 'extends' field")
    
    if "compilerOptions" not in config:
        warnings.append(f"{tsconfig_path}: Missing 'compilerOptions'")
    elif "outDir" not in config["compilerOptions"]:
        warnings.append(f"{tsconfig_path}: Missing 'outDir' in compilerOptions")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: cli.py <project-path>")
        sys.exit(1)
    
    results = validate_build_configs(sys.argv[1])
    
    # Print results
    for error in results["errors"]:
        print(f"❌ ERROR: {error['message']}")
    
    for warning in results["warnings"]:
        print(f"⚠️  WARNING: {warning}")
    
    # Exit with error code if errors found
    sys.exit(len(results["errors"]))
```

#### 4. Document the Validator

```markdown
# Build Configuration Validator

## Purpose
Ensures all CORA modules have required build configuration files.

## Checks
- ✅ All module frontends have `tsconfig.json`
- ✅ tsconfig.json has required fields (extends, outDir)

## Usage
\`\`\`bash
python validation/build-config-validator/cli.py /path/to/project
\`\`\`

## Exit Codes
- 0: All checks passed
- 1+: Number of errors found

## Integration
Add to cora-validate.py:
\`\`\`python
validators['build_config'] = BuildConfigValidator()
\`\`\`
```

#### 5. Integrate with Validation Suite

```python
# validation/cora-validate.py

from build_config_validator import cli as build_config_validator

VALIDATORS = {
    # ... existing validators ...
    'build_config': {
        'name': 'Build Configuration',
        'module': build_config_validator,
        'function': 'validate_build_configs',
    }
}
```

#### 6. Test the Validator

```bash
# Test on project with missing tsconfig.json
cd ~/code/bodhix/testing/test-valid/ai-sec-stack
python ~/code/bodhix/cora-dev-toolkit/validation/build-config-validator/cli.py .

# Expected output:
# ❌ ERROR: Missing tsconfig.json in module-voice/frontend
# ❌ ERROR: Missing tsconfig.json in module-eval/frontend

# Test on project with all files present
# (after adding tsconfig.json)
# Expected output: (no errors)
```

### Validator Creation Checklist

```
[ ] Identified need for validator
[ ] Defined validation rule clearly
[ ] Created validator directory structure
[ ] Implemented validation logic
[ ] Added error and warning reporting
[ ] Documented validator purpose and usage
[ ] Integrated with validation suite
[ ] Tested against positive cases (should pass)
[ ] Tested against negative cases (should fail)
[ ] Added to validator documentation
[ ] Committed validator to repository
```

## Scripts to Create

Based on this investigation, these scripts would be valuable:

### 1. Template Completeness Checker

```bash
#!/bin/bash
# scripts/validate-template-completeness.sh
# Checks if all required files exist in all module templates

echo "Checking module templates..."

for module in templates/_modules-*/*; do
    if [ -d "$module/frontend" ]; then
        if [ ! -f "$module/frontend/tsconfig.json" ]; then
            echo "❌ Missing: $module/frontend/tsconfig.json"
        fi
    fi
done
```

### 2. Build Configuration Validator

Add to validation suite:
```python
# validation/build-config-validator/cli.py
def validate_build_configs(project_path):
    """Check all modules have required build configs"""
    errors = []
    for module in get_modules(project_path):
        tsconfig = f"{module}/frontend/tsconfig.json"
        if not file_exists(tsconfig):
            errors.append(f"Missing: {tsconfig}")
    return errors
```

### 3. Quick Investigation Helper

```bash
#!/bin/bash
# scripts/investigate-typescript-errors.sh
# Helper script to investigate TypeScript errors systematically

echo "=== TypeScript Error Investigation ==="
echo ""
echo "1. Checking if modules can be built..."
pnpm -r run build 2>&1 | grep -E "(Failed|error)" | head -20

echo ""
echo "2. Checking for tsconfig.json files..."
find packages/ -name "tsconfig.json" | wc -l
echo "   modules found with tsconfig.json"

echo ""
echo "3. Checking for dist/ folders..."
find packages/ -name "dist" -type d | wc -l
echo "   modules with dist/ folders"

echo ""
echo "4. Running type-check..."
pnpm -r run type-check 2>&1 | head -30
```

## Validator Maintenance Workflow

### Regular Validator Reviews

Schedule periodic reviews:
```
Quarterly:
[ ] Review all validator error/warning counts
[ ] Identify patterns in false positives
[ ] Update validators for new patterns discovered
[ ] Add new validators for recurring issues
[ ] Archive obsolete validators
```

### When Issues Are Discovered

```
1. Issue Found → Document the pattern
2. Check existing validators → Do they catch this?
3. If NO → Create new validator
4. If YES but missed → Fix false negative
5. If YES but wrong → Fix false positive
6. Update validator documentation
7. Test against known cases
8. Commit and deploy
```

### Validator Performance Metrics

Track validator effectiveness:
```
Validator: Build Config Validator
- Created: 2026-01-19
- Trigger: 2,105 errors from missing tsconfig.json
- Impact: Would have caught issue in templates
- Prevented: All future projects from having this issue
- Status: Active
```

## Key Takeaways

1. **Question assumptions** - Plans can be wrong
2. **Verify before acting** - Search for issues before fixing
3. **Fix root causes** - Not just symptoms
4. **Simple solutions first** - Don't over-engineer
5. **Build before validate** - Configuration enables validation
6. **Templates matter** - Fix templates first, always
7. **Document findings** - Help future developers/AIs
8. **Improve validators** - Fix false positives/negatives continuously
9. **Create new validators** - Catch issues proactively, before users experience them

## Success Metrics

This methodology resulted in:
- ✅ 98% error reduction (2,136 errors eliminated)
- ✅ 95% time saved (30 min vs 1-2 days)
- ✅ Simpler solution (2 files vs 500 edits)
- ✅ New standard established (tsconfig.json required)
- ✅ Template improved for all future projects

## References

- **Case Study:** Validation Remediation Phase 1.2
- **Plan:** `docs/plans/plan_validation-remediation.md`
- **Standard:** `docs/standards/standard_MODULE-TSCONFIG.md`
- **Commits:** 279719c (post-validation fixes), eafb4c2 (tsconfig.json standard)

---

**Remember:** Investigation time is never wasted. It often saves 10x the time by finding the right solution immediately!
