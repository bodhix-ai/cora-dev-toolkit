# Scripts

This directory contains utility scripts for the {{PROJECT_NAME}} CORA application.

## Purpose

Scripts in this directory may include:

- Build automation
- Database migration helpers
- Data seeding scripts
- Development utilities
- Testing helpers

## Adding Scripts

When adding scripts to this directory:

1. Use clear, descriptive names
2. Include usage documentation in script headers
3. Make scripts executable: `chmod +x script-name.sh`
4. Follow project coding standards

## Example Structure

```
scripts/
├── README.md                    # This file
├── seed-dev-data.sh             # Seed development database
├── backup-database.sh           # Backup utilities
└── run-e2e-tests.sh             # Testing automation
```

## Running Scripts

Most scripts should be run from the project root directory:

```bash
cd {{PROJECT_NAME}}-stack
./scripts/your-script.sh
```

## Guidelines

- Keep scripts focused and single-purpose
- Use environment variables for configuration
- Include error handling and validation
- Document dependencies and prerequisites
