# CORA Templates - Standards and Guidelines

This directory contains the authoritative templates for creating CORA-compliant projects and modules.

## 🚨 CRITICAL: Placeholder Format Standards

All templates MUST use the **uppercase double-curly-brace** format for placeholders. The `scripts/create-cora-project.sh` script uses `sed` to replace these placeholders when creating new projects.

### ✅ CORRECT Placeholder Formats

| Placeholder | Description | Example Output |
|-------------|-------------|----------------|
| `{{PROJECT_NAME}}` | Machine-readable project name | `ai-sec` |
| `{{PROJECT_DISPLAY_NAME}}` | Human-readable display name | `AI Security` |
| `{{AWS_REGION}}` | AWS region for infrastructure | `us-east-1` |
| `{{GITHUB_ORG}}` | GitHub organization name | `bodhix-ai` |
| `{{CONFIG_FILE}}` | Setup config file basename | `setup.config.ai-sec.yaml` |

### ❌ WRONG Placeholder Formats (Will NOT be replaced)

| Incorrect Format | Why It Fails | Impact |
|------------------|--------------|--------|
| `@{project}/module-voice` | Single braces, lowercase | Import paths break, TypeScript errors |
| `{PROJECT_NAME}` | Single braces | Not recognized by sed replacement |
| `${project}` | Bash-style variable | Only works in shell scripts, not TypeScript/JSON |
| `$PROJECT_NAME` | Dollar sign without braces | Not recognized |

### Examples of Correct Usage

**TypeScript/TSX Files:**
```typescript
// ✅ CORRECT - Package imports
import { useVoiceSessions } from '@{{PROJECT_NAME}}/module-voice';
import type { VoiceSession } from '@{{PROJECT_NAME}}/module-voice';

// ❌ WRONG - Will not be replaced
import { useVoiceSessions } from '@{project}/module-voice';
```

**JSON Files (package.json):**
```json
{
  "name": "@{{PROJECT_NAME}}/module-voice",
  "dependencies": {
    "@{{PROJECT_NAME}}/api-client": "workspace:*"
  }
}
```

**Terraform Files:**
```hcl
resource "aws_lambda_function" "example" {
  function_name = "{{PROJECT_NAME}}-example-lambda"
  
  environment {
    variables = {
      PROJECT_NAME = "{{PROJECT_NAME}}"
    }
  }
}
```

### How Placeholder Replacement Works

The `scripts/create-cora-project.sh` script uses `sed` to find and replace placeholders:

```bash
# The script searches for {{PROJECT_NAME}} (case-sensitive, double braces)
sed -i "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$file"

# This pattern:
# - Matches {{PROJECT_NAME}} exactly
# - Replaces with actual project name (e.g., "ai-sec")
# - Processes all .ts, .tsx, .json, .tf, .md, .py, .sh files
```

**Important:** Only uppercase placeholders with double braces are recognized.

## 📋 Template Directory Structure

```
templates/
├── README.md                        # This file - standards and guidelines
├── _project-infra-template/         # Infrastructure repo template
├── _project-stack-template/         # Application repo template  
├── _modules-core/                   # Core CORA modules (always included)
│   ├── module-access/               # Tier 1: Identity & access control
│   ├── module-ai/                   # Tier 2: AI provider management
│   ├── module-mgmt/                 # Tier 3: Platform management
│   ├── module-kb/                   # Tier 3: Knowledge base
│   └── module-chat/                 # Tier 3: Chat & messaging
├── _modules-functional/             # Optional functional modules
│   ├── module-ws/                   # Workspace management
│   ├── module-eval/                 # Model evaluation
│   └── module-voice/                # Voice interaction
└── _module-template/                # Generic module scaffold
```

## 🎯 Validation

The **Portability Validator** checks for incorrect placeholder formats during validation:

```bash
# From project root
cd validation
python portability-validator/cli.py check-templates
```

Common violations caught:
- ❌ Single-brace placeholders: `{project}`
- ❌ Bash-style variables in non-shell files: `${project}`
- ❌ Incorrect package imports: `@{project}/module-name`
- ❌ Lowercase placeholders: `{{project_name}}`

## 📝 Creating New Templates

When adding new template files:

1. **Always use `{{PROJECT_NAME}}`** - Never variations like `{project}` or `@{project}/`
2. **Test placeholder replacement** - Run `create-cora-project.sh` to verify all placeholders are replaced
3. **Run validation** - Use Portability Validator to catch placeholder format issues
4. **Document in module.json** - Include metadata about the template

### Module Template Checklist

- [ ] All placeholders use `{{PROJECT_NAME}}` format
- [ ] Package imports reference `@{{PROJECT_NAME}}/package-name`
- [ ] No hardcoded project names (e.g., avoid `@ai-sec`, `@pm-app`)
- [ ] No hardcoded AWS regions (use `{{AWS_REGION}}` or env vars)
- [ ] Infrastructure uses Terraform variables, not hardcoded values
- [ ] Passes Portability Validator checks

## 🔧 Troubleshooting

### Issue: Imports break after creating project from template

**Symptom:** TypeScript errors like `Cannot find module '@{project}/module-voice'`

**Cause:** Template used incorrect placeholder format (single braces instead of double)

**Fix:** 
1. Update template to use `@{{PROJECT_NAME}}/module-voice`
2. Re-run project creation script
3. Run `pnpm install` in the new project

### Issue: sed replacement doesn't work

**Symptom:** Placeholders remain unchanged in generated project

**Cause:** Placeholder doesn't match the pattern `{{PROJECT_NAME}}` (case-sensitive)

**Fix:** Ensure placeholders are:
- Uppercase: `PROJECT_NAME`, not `project_name`
- Double braces: `{{}}`, not `{}`
- Exact match: `{{PROJECT_NAME}}`, not `{{ PROJECT_NAME }}` (no spaces)

## 📚 References

- **Module Registry:** `_modules-core/module-registry.yaml` - Metadata for all CORA modules
- **Create Script:** `../scripts/create-cora-project.sh` - Project creation automation
- **Standards:** `../docs/standards/` - CORA compliance standards
- **ADR-013:** `../docs/arch decisions/ADR-013-CORE-MODULE-CRITERIA.md` - Module classification criteria

## 🤖 AI Agent Guidelines

When modifying templates or creating new ones:

1. **Always verify placeholder format** - Use `{{PROJECT_NAME}}`, never variations
2. **Check for hardcoded values** - Replace with placeholders or environment variables
3. **Test template generation** - Run `create-cora-project.sh` to validate
4. **Run Portability Validator** - Catch issues before they reach production

**Common AI Mistakes:**
- Using lowercase placeholders: `{project}` instead of `{{PROJECT_NAME}}`
- Copying from test projects with hardcoded names like `@ai-sec`
- Using relative imports in route files instead of package aliases

**Correct Approach:**
1. Update template with `{{PROJECT_NAME}}` placeholders
2. Verify with grep: `grep -r "@{project}" templates/` should return nothing
3. Test by creating a new project from the template
4. Validate generated project passes all validators
