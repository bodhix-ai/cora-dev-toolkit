# CORA Frontend Validation

Run frontend-specific validators only.

## 1. Run Frontend Validators

```bash
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ ! -f "./validation/cora-validate.py" ]; then
    echo "ERROR: Validation script not found. Are you in the project root?"
    exit 1
fi

# Run project validation with frontend-related validators
# Use --include to select specific validators
python3 ./validation/cora-validate.py project . --include a11y,frontend-compliance 2>&1 || {
    echo "ERROR: Validation failed. Check Python 3 and dependencies."
    exit 1
}
```

## 2. Analyze Results

Focus on:
- Section 508 accessibility compliance (alt text, labels, contrast)
- CORA UI standards (Sidebar, AppShell, ModuleLayout)
- Next.js patterns (App Router, Server/Client components)

## 3. Present Results with Dual-Path Guidance

Show errors categorized by type, then provide guidance:

**Option A: Natural Language (Skill Activation)**
- "Fix the accessibility errors" - for Section 508/WCAG issues
- "Fix the UI compliance" - for CORA component pattern issues

**Option B: Direct Workflow (Guaranteed)**
- `/fix-frontend.md` - loads frontend expertise directly

## 4. Remediation

When you request a fix, the `cora-toolkit-validation-frontend` skill will activate 
and guide you through the Template-First workflow.

If the skill doesn't activate, use `/fix-frontend.md` as a guaranteed fallback.
