# CORA Project Setup Guide

**For AI Agents (Cline) and Human Developers**

This guide provides step-by-step instructions for creating a new CORA project. The process is divided into **AI-automated tasks** (performed by Cline) and **human tasks** (require manual configuration).

---

## Quick Start (For AI Agents)

When a user requests a new CORA project, follow these steps:

```bash
# 1. Navigate to the toolkit
cd /path/to/cora-dev-toolkit

# 2. Run the project creation script
./scripts/create-cora-project.sh {project-name} \
  --folder {test-folder} \
  --output-dir ~/code/sts \
  --org {github-org} \
  --region {aws-region} \
  --with-core-modules \
  --create-repos
```

This creates:

- `{project-name}-infra` - Infrastructure repository
- `{project-name}-stack` - Application code repository
- Core modules: module-access, module-ai, module-mgmt
- Functional modules from `setup.config.{project}.yaml` (if configured)
- Merged `cora-modules.config.yaml` for navigation and admin cards

### Script Options

| Option | Description |
|--------|-------------|
| `--folder <name>` | Parent directory name (organizes repos in a folder) |
| `--output-dir <path>` | Base directory (default: current) |
| `--with-core-modules` | Include core modules (access, ai, mgmt) |
| `--modules <list>` | Comma-separated functional modules (e.g., `module-ws`) |
| `--org <name>` | GitHub organization |
| `--region <region>` | AWS region (default: us-east-1) |
| `--create-repos` | Create GitHub repositories |
| `--no-git` | Skip git initialization |
| `--dry-run` | Preview without creating |

### Functional Module Selection

Functional modules can be enabled via config file or command line:

**Option 1: Config File (Recommended)**
```yaml
# templates/_project-stack-template/setup.config.{project}.yaml
modules:
  enabled:
    - module-ws
    - module-kb
```

**Option 2: Command Line**
```bash
./scripts/create-cora-project.sh my-app --with-core-modules --modules module-ws,module-kb
```

For each enabled functional module, the script:
1. Creates package in `packages/module-{name}/`
2. Adds module to Terraform `main.tf`
3. Merges config into `cora-modules.config.yaml`

---

## Complete Setup Checklist

### Phase 1: AI-Automated Tasks ✅

These tasks are performed by Cline automatically:

- [ ] **1.1** Run `create-cora-project.sh` with `--with-core-modules`
- [ ] **1.2** Verify both repositories were created
- [ ] **1.3** Verify core modules exist in `{project}-stack/packages/`
- [ ] **1.4** Verify Terraform environment directories exist (dev, tst, stg, prd)
- [ ] **1.5** Verify `.clinerules` files are in place
- [ ] **1.6** Verify `project.json` files are configured
- [ ] **1.7** Run `pnpm install` in stack repo to verify dependencies

### Phase 2: Human Manual Tasks 🧑‍💻

These tasks require human action:

#### 2.1 Create Supabase Project

- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Create new project for `{project-name}`
- [ ] Note the following credentials:
  - Project URL
  - Anon key
  - Service role key
  - Database connection string

#### 2.2 Configure Identity Provider (Clerk/Okta)

- [ ] Create application in your IdP
- [ ] Configure redirect URLs:
  - Dev: `http://localhost:3000/api/auth/callback/{provider}`
  - Prod: `https://{domain}/api/auth/callback/{provider}`
- [ ] Note the following credentials:
  - Issuer URL
  - Client ID
  - Client Secret
  - JWKS URL

#### 2.3 Bootstrap AWS Accounts

```bash
cd {project-name}-infra

# Non-production account (dev, tst)
AWS_PROFILE={nonprod-profile} ./bootstrap/bootstrap_tf_state.sh dev

# Production account (stg, prd)
AWS_PROFILE={prod-profile} ./bootstrap/bootstrap_tf_state.sh stg
```

#### 2.4 Configure AWS Secrets

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "{project-name}/supabase" \
  --secret-string '{
    "url": "https://xxx.supabase.co",
    "anon_key": "xxx",
    "service_role_key": "xxx"
  }'

aws secretsmanager create-secret \
  --name "{project-name}/auth" \
  --secret-string '{
    "issuer": "https://xxx",
    "client_id": "xxx",
    "client_secret": "xxx"
  }'
```

#### 2.5 Configure Environment Variables

```bash
cd {project-name}-stack

# Copy example env file
cp .env.example .env.local

# Edit with your values
# Required variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXTAUTH_URL
# - NEXTAUTH_SECRET
# - {PROVIDER}_CLIENT_ID
# - {PROVIDER}_CLIENT_SECRET
# - {PROVIDER}_ISSUER
```

### Phase 3: AI-Assisted Deployment 🤖

After human tasks are complete, Cline can assist with:

- [ ] **3.1** Deploy Terraform infrastructure

  ```bash
  cd {project-name}-infra
  ./scripts/deploy-terraform.sh dev
  ```

- [ ] **3.2** Apply database schema

  ```bash
  # Apply org-module schema (foundation)
  cd {project-name}-stack/packages/module-access/db/schema
  psql $DATABASE_URL -f 001-*.sql
  psql $DATABASE_URL -f 002-*.sql
  # ... continue with all schema files
  ```

- [ ] **3.3** Build and deploy CORA modules

  ```bash
  cd {project-name}-infra
  ./scripts/build-cora-modules.sh
  ./scripts/deploy-cora-modules.sh dev
  ```

- [ ] **3.4** Start development server
  ```bash
  cd {project-name}-stack
  pnpm dev
  ```

---

## Verification Checklist

After setup, verify:

- [ ] Can access the web app at `http://localhost:3000`
- [ ] Login with IdP works
- [ ] User profile is created in Supabase
- [ ] Organization context is available
- [ ] API Gateway routes respond
- [ ] Module-access endpoints work

---

## Environment Configuration Reference

### Required Environment Variables

| Variable                        | Description          | Where to Get              |
| ------------------------------- | -------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL | Supabase dashboard        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key    | Supabase dashboard        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service key | Supabase dashboard        |
| `NEXTAUTH_URL`                  | Full app URL         | Your domain               |
| `NEXTAUTH_SECRET`               | Auth encryption key  | `openssl rand -base64 32` |
| `{PROVIDER}_CLIENT_ID`          | IdP client ID        | IdP dashboard             |
| `{PROVIDER}_CLIENT_SECRET`      | IdP client secret    | IdP dashboard             |
| `{PROVIDER}_ISSUER`             | IdP issuer URL       | IdP dashboard             |

### AWS Account Mapping

| Environment | AWS Account    | Purpose     |
| ----------- | -------------- | ----------- |
| dev         | Non-Production | Development |
| tst         | Non-Production | Testing/QA  |
| stg         | Production     | Staging     |
| prd         | Production     | Production  |

---

## Troubleshooting

### Common Issues

**Issue: "Template not found"**

- Ensure you're running from the `cora-dev-toolkit` directory
- Check that templates exist in `templates/`

**Issue: "GitHub repo creation failed"**

- Ensure `gh` CLI is installed and authenticated
- Check organization access permissions

**Issue: "Terraform init failed"**

- Run bootstrap script first
- Check AWS credentials are configured

**Issue: "Cannot connect to Supabase"**

- Verify Supabase URL is correct
- Check RLS policies are applied
- Ensure service role key is used for backend

---

## AI Agent Notes

When helping users set up CORA projects:

1. **Always run the creation script first** - This sets up the baseline
2. **Guide users through manual steps** - Be explicit about what they need to do
3. **Offer to help with deployment** - Once manual steps are done
4. **Verify each phase** - Check that previous steps completed before moving on
5. **Reference the .clinerules** - Each repo has specific instructions

### Example Interaction

**User:** "Create a new CORA project called 'my-app' for our organization 'acme-corp'"

**Cline should:**

1. Navigate to cora-dev-toolkit
2. Run: `./scripts/create-cora-project.sh my-app --org acme-corp --with-core-modules`
3. Report what was created
4. Provide the manual steps checklist
5. Offer to help with deployment once manual steps are done

---

## Success Criteria

A CORA project setup is complete when:

✅ Both repositories exist with proper structure  
✅ Core modules are scaffolded  
✅ Terraform state is bootstrapped  
✅ Supabase project is configured  
✅ Identity provider is integrated  
✅ User can log in and see org context  
✅ API endpoints respond correctly

**Target Time:** < 1 day from start to working login

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025
