# CORA Documentation Standards

**Status:** 📋 Phase 1 Documentation  
**Created:** December 10, 2025  
**Purpose:** Define where documentation lives and standards for CORA projects

---

## Overview

CORA projects have documentation at three levels:

1. **Toolkit Documentation** - Standards and patterns in `cora-dev-toolkit/docs/`
2. **Repository Documentation** - Project-specific docs in `{project}-stack/docs/` and `{project}-infra/docs/`
3. **Module Documentation** - Module-specific docs in `packages/module-{name}/docs/`

This guide defines what documentation belongs where and the standards for each.

---

## Documentation Hierarchy

```
cora-dev-toolkit/              # CORA standards (source of truth)
├── docs/
│   ├── cora-project-boilerplate.md      # Project structure standards
│   ├── cora-core-modules.md             # Core module specifications
│   ├── cora-module-definition-of-done.md # Module certification
│   └── cora-documentation-standards.md  # This document
│
{project}-stack/               # Application code repo
├── docs/
│   ├── architecture/          # System architecture docs
│   ├── implementation/        # Implementation guides
│   ├── features/              # Feature documentation
│   └── user-guides/           # End-user documentation
│
├── packages/module-{name}/    # Individual modules
│   └── docs/
│       ├── README.md          # Module overview
│       ├── api-reference.md   # API documentation
│       └── integration-guide.md
│
{project}-infra/               # Infrastructure repo
└── docs/
    ├── ADR-*.md               # Architecture Decision Records
    └── deployment-guide.md    # Deployment procedures
```

---

## Documentation by Level

### Level 1: Toolkit Documentation

Location: `cora-dev-toolkit/docs/`

**Purpose:** Define CORA standards that apply to ALL projects.

**What belongs here:**

- Architecture patterns and standards
- Module development guidelines
- Validation rules and procedures
- Migration guides from legacy patterns
- Compliance checklists

**Naming convention:** `lowercase-kebab-case.md`

**Required documents:**

| Document                            | Purpose                        |
| ----------------------------------- | ------------------------------ |
| `cora-project-boilerplate.md`       | Project structure requirements |
| `cora-core-modules.md`              | Core module specifications     |
| `cora-module-definition-of-done.md` | Module certification criteria  |
| `cora-documentation-standards.md`   | This document                  |
| `cora-validation-guide.md`          | Validation framework           |

---

### Level 2: Repository Documentation

Location: `{project}-stack/docs/` and `{project}-infra/docs/`

**Purpose:** Project-specific documentation that doesn't apply to other CORA projects.

#### Stack Repository (`{project}-stack/docs/`)

**Required directories:**

```
docs/
├── architecture/       # System design docs
│   ├── overview.md     # High-level architecture
│   └── data-flow.md    # Data flow diagrams
│
├── implementation/     # Implementation details
│   └── {feature}.md    # Feature implementation notes
│
├── features/           # Feature documentation
│   └── {feature}.md    # User-facing feature docs
│
└── user-guides/        # End-user documentation
    └── getting-started.md
```

**What belongs here:**

- Project-specific architecture decisions
- Feature implementation guides
- User documentation
- Troubleshooting guides
- Release notes

#### Infra Repository (`{project}-infra/docs/`)

**Required directories:**

```
docs/
├── ADR-*.md           # Architecture Decision Records
├── deployment-guide.md # How to deploy
└── infrastructure.md   # Infrastructure overview
```

**What belongs here:**

- Infrastructure architecture decisions (ADRs)
- Deployment procedures
- Environment configuration guides
- Runbooks and incident response

---

### Level 3: Module Documentation

Location: `packages/module-{name}/docs/`

**Purpose:** Documentation specific to a single module.

**Required files:**

| File                        | Purpose                     | Required |
| --------------------------- | --------------------------- | -------- |
| `README.md`                 | Module overview at root     | ✅ Yes   |
| `docs/api-reference.md`     | API endpoints documentation | ✅ Yes   |
| `docs/integration-guide.md` | How to use this module      | ✅ Yes   |

**Optional files:**

| File                      | Purpose                       |
| ------------------------- | ----------------------------- |
| `docs/data-model.md`      | Database schema documentation |
| `docs/troubleshooting.md` | Common issues and solutions   |
| `docs/changelog.md`       | Module version history        |

---

## Documentation Templates

### Module README.md Template

```markdown
# module-{name}

Brief description of what this module does.

## Overview

More detailed explanation of the module's purpose and capabilities.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash

# Add to your pnpm-workspace.yaml

pnpm add @packages/module-{name}
\`\`\`

## Quick Start

\`\`\`typescript
import { useFeature } from '@packages/module-{name}';

function MyComponent() {
const { data } = useFeature();
return <div>{data}</div>;
}
\`\`\`

## API Reference

See [API Reference](./docs/api-reference.md) for complete documentation.

## Dependencies

- module-access (required)
- Other dependencies...

## Configuration

Environment variables required:

| Variable   | Description | Default   |
| ---------- | ----------- | --------- |
| `VAR_NAME` | Description | `default` |

## License

MIT
```

### API Reference Template

```markdown
# module-{name} API Reference

## Endpoints

### GET /path/to/resource

Description of what this endpoint does.

**Request:**

\`\`\`bash
curl -X GET https://api.example.com/path/to/resource \\
-H "Authorization: Bearer {token}"
\`\`\`

**Response:**

\`\`\`json
{
"data": {
"id": "123",
"name": "Example"
}
}
\`\`\`

**Error Responses:**

| Status | Description        |
| ------ | ------------------ |
| 401    | Unauthorized       |
| 404    | Resource not found |

### POST /path/to/resource

...

## Schemas

### ResourceSchema

\`\`\`typescript
interface Resource {
id: string;
name: string;
createdAt: string;
updatedAt: string;
}
\`\`\`
```

### Integration Guide Template

```markdown
# module-{name} Integration Guide

## Prerequisites

- module-access configured
- Database migrations applied

## Setup

### 1. Install the Module

\`\`\`bash
pnpm add @packages/module-{name}
\`\`\`

### 2. Configure Providers

Add the context provider to your app layout:

\`\`\`typescript
import { FeatureProvider } from '@packages/module-{name}';

export default function Layout({ children }) {
return (
<FeatureProvider>
{children}
</FeatureProvider>
);
}
\`\`\`

### 3. Use Hooks

\`\`\`typescript
import { useFeature } from '@packages/module-{name}';

function MyComponent() {
const { data, loading, error } = useFeature();
// ...
}
\`\`\`

## Common Patterns

### Pattern 1: Basic Usage

...

### Pattern 2: Advanced Usage

...

## Troubleshooting

### Issue: Feature not loading

Solution: Check that...
```

---

## Writing Standards

### General Guidelines

1. **Use clear, actionable language** - Write for developers who need to implement
2. **Include code examples** - Show, don't just tell
3. **Keep it current** - Update docs when code changes
4. **Link related docs** - Help readers find more information

### Formatting Standards

| Element     | Convention                                   |
| ----------- | -------------------------------------------- |
| File names  | `lowercase-kebab-case.md`                    |
| Headings    | Title Case for H1, H2; Sentence case for H3+ |
| Code blocks | Include language identifier                  |
| Lists       | Use `-` for unordered, `1.` for ordered      |
| Links       | Relative paths within same repo              |

### Code Examples

Always include:

- Language identifier in code blocks
- Comments explaining non-obvious parts
- Complete, runnable examples when possible

```typescript
// ✅ Good - Complete, documented example
import { useFeature } from "@packages/module-feature";

export function MyComponent() {
  // Fetch data using the module hook
  const { data, loading, error } = useFeature();

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <FeatureList items={data} />;
}
```

```typescript
// ❌ Bad - Incomplete, no context
const { data } = useFeature();
return <div>{data}</div>;
```

---

## Documentation Validation

### Automated Checks

The documentation validator checks:

1. **Required files exist** - README.md, api-reference.md, etc.
2. **Links are valid** - No broken internal links
3. **Code blocks are formatted** - Language identifiers present
4. **Headings are consistent** - Proper hierarchy (H1 > H2 > H3)

### Running Validation

```bash
# Validate module documentation
python scripts/validation/doc-validator.py --path=packages/module-{name}

# Validate all documentation
python scripts/validation/doc-validator.py --all
```

### Validation Rules

```yaml
required_files:
  module:
    - README.md
    - docs/api-reference.md
    - docs/integration-guide.md

  repo:
    - README.md
    - docs/architecture/overview.md

link_validation:
  check_internal: true
  check_external: false # Too slow for CI

code_block_validation:
  require_language: true
  allowed_languages:
    - typescript
    - javascript
    - python
    - bash
    - json
    - yaml
    - sql
```

---

## Updating Documentation

### When to Update

- **New feature** - Add feature documentation
- **API change** - Update API reference
- **Bug fix** - Update if behavior documented incorrectly
- **Deprecation** - Mark deprecated, add migration guide

### Update Process

1. Update documentation in same PR as code change
2. Run documentation validation
3. Review for accuracy
4. Merge with code

### Documentation in PRs

Include in PR description:

- What documentation was updated
- Why it was necessary
- Any documentation TODOs for follow-up

---

## Related Documentation

- [cora-project-boilerplate.md](./cora-project-boilerplate.md) - Project structure
- [cora-core-modules.md](./cora-core-modules.md) - Core module specifications
- [cora-module-definition-of-done.md](./cora-module-definition-of-done.md) - Module certification

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025  
**Status:** Phase 1 Complete
