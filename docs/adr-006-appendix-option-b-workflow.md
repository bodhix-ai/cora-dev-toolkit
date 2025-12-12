# ADR-006 Appendix: Option B Development Workflow

**Parent Document:** [ADR-006: Core Module Version Control Strategy](./adr-006-core-module-version-control.md)  
**Focus:** Separate Repos Per Core Module - Development & Testing Workflows

---

## Repository Structure (Option B)

```
GitHub Organization: bodhix-ai/

Core Module Repos (Independent):
├── cora-module-access    (v1.2.0) - @cora/module-access
├── cora-module-ai        (v1.1.0) - @cora/module-ai
└── cora-module-mgmt      (v1.3.0) - @cora/module-mgmt

Functional Module Repos (Independent):
├── cora-module-kb        (v2.0.0) - @cora/module-kb
├── cora-module-chat      (v1.5.0) - @cora/module-chat
└── ... other modules

Project Repos (Consumers):
├── pm-app-stack          (uses @cora/module-*)
├── project-2-stack       (uses @cora/module-*)
└── ... other projects
```

---

## Dependency Graph

```
Tier 1 (No dependencies):
  └── module-access

Tier 2 (Depends on T1):
  └── module-ai → module-access

Tier 3 (Depends on T1 + T2):
  └── module-mgmt → module-access, module-ai

Functional (Depends on Core):
  ├── module-kb   → module-access, module-ai
  ├── module-chat → module-access, module-ai
  └── ...
```

---

## Package.json Dependencies

### In `cora-module-ai/package.json`:

```json
{
  "name": "@cora/module-ai",
  "version": "1.1.0",
  "peerDependencies": {
    "@cora/module-access": "^1.0.0"
  },
  "devDependencies": {
    "@cora/module-access": "^1.2.0"
  }
}
```

### In `cora-module-kb/package.json`:

```json
{
  "name": "@cora/module-kb",
  "version": "2.0.0",
  "peerDependencies": {
    "@cora/module-access": "^1.0.0",
    "@cora/module-ai": "^1.0.0"
  },
  "devDependencies": {
    "@cora/module-access": "^1.2.0",
    "@cora/module-ai": "^1.1.0"
  }
}
```

### In `pm-app-stack/package.json`:

```json
{
  "dependencies": {
    "@cora/module-access": "1.2.0",
    "@cora/module-ai": "1.1.0",
    "@cora/module-mgmt": "1.3.0",
    "@cora/module-kb": "2.0.0",
    "@cora/module-chat": "1.5.0"
  }
}
```

---

## Development Scenarios

### Scenario 1: Developing module-kb with AI Config Dependencies

**Context:** module-kb needs to get default AI model from module-ai's config.

#### Option A: Use Published Versions (Recommended for most work)

```bash
# In cora-module-kb repo
cd cora-module-kb
pnpm install  # Installs @cora/module-ai from npm registry

# Develop against published module-ai
pnpm test
pnpm build
```

#### Option B: Local Linking (When modifying both modules)

```bash
# Terminal 1: Build module-ai in watch mode
cd ~/code/cora-module-ai
pnpm build:watch

# Terminal 2: Link and develop module-kb
cd ~/code/cora-module-kb
pnpm link ../cora-module-ai  # Local link

# Now changes to module-ai are immediately available
pnpm test
```

#### Option C: Workspace Development (Full Integration Testing)

Create a `cora-dev-workspace` for cross-module development:

```yaml
# cora-dev-workspace/pnpm-workspace.yaml
packages:
  - "modules/*"
  - "test-project"
```

```bash
# Clone all modules into workspace
mkdir cora-dev-workspace && cd cora-dev-workspace
git clone git@github.com:bodhix-ai/cora-module-access.git modules/module-access
git clone git@github.com:bodhix-ai/cora-module-ai.git modules/module-ai
git clone git@github.com:bodhix-ai/cora-module-kb.git modules/module-kb

# All modules automatically linked via pnpm workspace
pnpm install
pnpm -r build
pnpm -r test
```

---

### Scenario 2: Bug Fix in module-ai (Used by kb, chat, etc.)

**Context:** Found a bug in AI model selection that affects module-kb and module-chat.

#### Step 1: Fix in module-ai repo

```bash
cd cora-module-ai

# Create fix branch
git checkout -b fix/model-selection-bug

# Make the fix
# ... edit files ...

# Run module-ai's own tests
pnpm test

# Bump patch version
pnpm version patch  # 1.1.0 → 1.1.1
```

#### Step 2: Test with dependent modules (before publishing)

```bash
# Option A: Local link test
cd ../cora-module-kb
pnpm link ../cora-module-ai
pnpm test  # Verify fix works in kb context

cd ../cora-module-chat
pnpm link ../cora-module-ai
pnpm test  # Verify fix works in chat context
```

```bash
# Option B: Publish pre-release for broader testing
cd cora-module-ai
pnpm publish --tag beta  # Publishes as @cora/module-ai@1.1.1-beta.0

# Test in project
cd ../pm-app-stack
pnpm add @cora/module-ai@beta
pnpm test
```

#### Step 3: Publish and update consumers

```bash
# Publish stable release
cd cora-module-ai
git push origin fix/model-selection-bug
# Create PR, get review, merge

# After merge, CI publishes 1.1.1 to npm

# Update dependent modules
cd ../cora-module-kb
pnpm add @cora/module-ai@1.1.1
pnpm test
git commit -am "chore: bump module-ai to 1.1.1"

# Update projects
cd ../pm-app-stack
pnpm add @cora/module-ai@1.1.1
```

---

### Scenario 3: New Feature Requiring Coordinated Changes

**Context:** Adding "AI Model Preferences" feature that touches module-ai AND module-kb.

#### Step 1: Plan the changes

```markdown
## Feature: AI Model Preferences

### module-ai changes (v1.2.0):

- Add `getModelPreferences()` API
- Add `setModelPreferences()` API
- New type: `ModelPreferences`

### module-kb changes (v2.1.0):

- Use AI model preferences for KB generation
- Add UI for model selection
- Depends on module-ai ^1.2.0
```

#### Step 2: Develop module-ai first (lower tier)

```bash
cd cora-module-ai
git checkout -b feature/model-preferences

# Add new APIs
# ... implement ...

# Test in isolation
pnpm test

# Build for local testing
pnpm build
```

#### Step 3: Develop module-kb with linked module-ai

```bash
cd cora-module-kb
git checkout -b feature/model-preferences

# Link to local module-ai
pnpm link ../cora-module-ai

# Implement KB changes that use new AI APIs
# ... implement ...

# Test with linked module
pnpm test
```

#### Step 4: Integration testing in workspace

```bash
cd cora-dev-workspace
# Both branches checked out

# Full integration test
pnpm -r build
pnpm -r test

# Spin up local dev environment
pnpm dev  # Runs test-project with all modules linked
```

#### Step 5: Coordinated release

```bash
# Release module-ai first
cd cora-module-ai
pnpm version minor  # 1.1.1 → 1.2.0
git push && # PR/merge → CI publishes

# Then release module-kb
cd cora-module-kb
# Update peer dependency
pnpm add @cora/module-ai@^1.2.0 --save-peer
pnpm version minor  # 2.0.0 → 2.1.0
git push && # PR/merge → CI publishes

# Update projects
cd pm-app-stack
pnpm add @cora/module-ai@1.2.0 @cora/module-kb@2.1.0
```

---

## Testing Strategies

### Unit Tests (Per Module)

Each module repo has its own test suite:

```
cora-module-kb/
├── src/
├── tests/
│   ├── unit/           # Pure unit tests, mock dependencies
│   │   ├── kb-service.test.ts
│   │   └── kb-handler.test.ts
│   └── integration/    # Tests with real module-ai (devDep)
│       └── kb-ai-integration.test.ts
```

```typescript
// tests/unit/kb-service.test.ts
import { KBService } from "../src/kb-service";
import { mockModuleAI } from "./__mocks__/module-ai";

jest.mock("@cora/module-ai", () => mockModuleAI);

describe("KBService", () => {
  it("uses default model from AI config", () => {
    const service = new KBService();
    expect(service.getDefaultModel()).toBe("gpt-4");
  });
});
```

```typescript
// tests/integration/kb-ai-integration.test.ts
import { KBService } from "../src/kb-service";
import { AIConfigService } from "@cora/module-ai"; // Real import

describe("KB + AI Integration", () => {
  it("retrieves model from actual AI module", () => {
    const aiConfig = new AIConfigService();
    const kb = new KBService(aiConfig);
    // Real integration test
  });
});
```

### Contract Tests (Between Modules)

Define contracts that module-ai must fulfill:

```typescript
// cora-module-kb/tests/contracts/module-ai.contract.ts
import { AIConfigService } from "@cora/module-ai";

describe("module-ai contract", () => {
  it("provides getDefaultModel()", () => {
    const service = new AIConfigService();
    expect(typeof service.getDefaultModel).toBe("function");
  });

  it("returns valid model identifier", () => {
    const service = new AIConfigService();
    const model = service.getDefaultModel();
    expect(model).toMatch(/^(gpt-|claude-|bedrock-)/);
  });
});
```

### E2E Tests (In Project Repos)

```
pm-app-stack/
├── tests/
│   └── e2e/
│       ├── kb-flow.spec.ts      # Tests KB with all real modules
│       └── chat-flow.spec.ts    # Tests Chat with all real modules
```

---

## CI/CD Workflows

### Per-Module CI (cora-module-ai)

```yaml
# .github/workflows/ci.yml
name: Module CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build

  # Test with dependent modules (optional but recommended)
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Checkout module-kb
        uses: actions/checkout@v4
        with:
          repository: bodhix-ai/cora-module-kb
          path: module-kb
      - run: |
          pnpm build
          cd module-kb
          pnpm link ..
          pnpm test
```

### Release Automation

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
      - run: pnpm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  notify-dependents:
    needs: publish
    runs-on: ubuntu-latest
    steps:
      - name: Trigger dependent module CIs
        run: |
          # Trigger CI in modules that depend on this one
          gh workflow run ci.yml -R bodhix-ai/cora-module-kb
          gh workflow run ci.yml -R bodhix-ai/cora-module-chat
```

---

## Version Coordination

### Semantic Versioning Rules

| Change Type                      | Version Bump | Example       |
| -------------------------------- | ------------ | ------------- |
| Bug fix, no API change           | Patch        | 1.1.0 → 1.1.1 |
| New feature, backward compatible | Minor        | 1.1.1 → 1.2.0 |
| Breaking change                  | Major        | 1.2.0 → 2.0.0 |

### Dependency Version Ranges

```json
// In module-kb
"peerDependencies": {
  "@cora/module-ai": "^1.0.0"  // Works with any 1.x.x
}
```

- `^1.0.0` = Compatible with 1.0.0 and higher (not 2.0.0)
- `~1.1.0` = Compatible with 1.1.x only
- `1.1.0` = Exact version only

### Coordinated Releases (When Needed)

For breaking changes, coordinate releases:

1. **Announce** breaking change in module-ai CHANGELOG
2. **Pre-release** module-ai@2.0.0-beta.0
3. **Update** dependent modules to work with v2
4. **Release** all modules together
5. **Update** projects

---

## Recommended Tooling

### Changesets (Version Management)

```bash
# Install changesets
pnpm add -D @changesets/cli

# When making changes
pnpm changeset  # Creates changeset file

# When releasing
pnpm changeset version  # Bumps versions
pnpm changeset publish  # Publishes to npm
```

### Renovate/Dependabot (Automated Updates)

```json
// renovate.json in each project
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchPackagePatterns": ["^@cora/"],
      "groupName": "CORA modules",
      "automerge": false
    }
  ]
}
```

### CORA Module CLI (Custom Tooling)

```bash
# Future: cora-cli for module management
cora module create module-billing
cora module test --with-deps
cora module release patch
cora project update-modules
```

---

## Summary: Option B Development Workflow

| Scenario             | Workflow                                           |
| -------------------- | -------------------------------------------------- |
| Normal development   | Use published npm packages                         |
| Cross-module feature | Local linking or workspace                         |
| Bug fix              | Fix → test locally → publish patch                 |
| Breaking change      | Coordinate releases across modules                 |
| Testing              | Unit (mocked) + Integration (real deps) + Contract |
| CI/CD                | Per-module CI + integration tests + auto-notify    |

### Pros of Option B Realized:

- ✅ Independent versioning and releases
- ✅ Clear ownership per module
- ✅ Smaller, focused repos
- ✅ Parallel development by different teams

### Cons to Manage:

- ⚠️ More repos to maintain (tooling helps)
- ⚠️ Coordination for breaking changes (process + communication)
- ⚠️ Local development setup more complex (workspace helps)

---

## Next Steps if Option B Selected

1. **Create initial repos:**

   - `bodhix-ai/cora-module-access`
   - `bodhix-ai/cora-module-ai`
   - `bodhix-ai/cora-module-mgmt`

2. **Set up npm organization:** `@cora/*`

3. **Create development workspace:** `cora-dev-workspace`

4. **Implement CI/CD templates** for each module repo

5. **Extract current pm-app modules** into new repos

6. **Document module contracts** between modules
