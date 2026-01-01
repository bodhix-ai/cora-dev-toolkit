# Contributing to CORA Core Modules

Thank you for your interest in contributing to CORA Core Modules! This document provides guidelines for contributing enhancements back to the upstream repository.

## Overview

CORA Core Modules follows an **open source fork model**:

1. Projects fork/copy from this upstream repository
2. Projects customize freely for their needs
3. Enhancements flow back via PR process
4. Central maintainers review and merge contributions

## Types of Contributions

### 1. Bug Fixes

- Create an issue describing the bug
- Reference which project discovered it
- Submit PR with fix and tests

### 2. New Features

- Create RFC issue first
- Discuss design with maintainers
- Submit PR after approval

### 3. Documentation

- PRs welcome without prior discussion

## What Makes a Good Upstream Contribution

### ✅ DO contribute:

- Bug fixes applicable to all projects
- Generic features usable across projects
- Performance improvements
- Security enhancements
- Better error handling
- Improved types/documentation
- New utility functions that are broadly useful

### ❌ DON'T contribute:

- Project-specific business logic
- Custom roles/permissions for one project
- Hardcoded values (project names, AWS regions, account IDs)
- Features only one project needs
- Breaking changes without migration path

## Contribution Workflow

1. **Fork** cora-core-modules to your account (or work in a branch)
2. **Create branch** for your change: `feature/your-feature-name`
3. **Implement** following CORA patterns
4. **Test** in at least one project
5. **Submit PR** with:
   - Clear description of the change
   - Link to issue/RFC if applicable
   - Evidence of testing
6. **Review** - maintainers will review within 1 week
7. **Merge** - after approval and CI pass

## Pull Request Template

```markdown
## Description

Brief description of the change

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Performance improvement
- [ ] Security enhancement

## Tested In

- [ ] pm-app-stack
- [ ] Other project: \_\_\_

## Breaking Changes

- [ ] No breaking changes
- [ ] Breaking change (describe migration path)

## Checklist

- [ ] Code follows CORA patterns
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No hardcoded values
```

## Code Standards

### Module Structure

All modules must follow the standard structure:

```
module-{name}/
├── backend/
│   ├── lambdas/        # Lambda handlers
│   └── common/         # Shared utilities
├── frontend/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── contexts/       # React contexts
│   └── types/          # TypeScript types
├── db/
│   └── migrations/     # Database migrations
├── module.json         # Module metadata
└── README.md           # Module documentation
```

### Code Quality

- TypeScript for all frontend code
- Python 3.11+ for all Lambda code
- Follow existing code style
- Use meaningful variable/function names
- Add JSDoc/docstrings for public APIs

### No Hardcoded Values

Never include:

- Project names (e.g., `pm-app`)
- AWS regions (e.g., `us-east-1`)
- AWS account IDs
- Specific URLs
- API keys or secrets

Use environment variables or configuration instead.

## Versioning

We use semantic versioning:

- **Patch** (1.0.x): Bug fixes, no API changes
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

## Release Schedule

- **Patch releases**: As needed for critical fixes
- **Minor releases**: Monthly (when there are changes)
- **Major releases**: Quarterly with migration guide

## Getting Help

- **Questions**: Open a discussion issue
- **Bug Reports**: Use the bug report template
- **Feature Requests**: Open an RFC issue

## Maintainers

Core module maintainers review all contributions. Current maintainers:

- (List maintainers here)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to CORA Core Modules!
