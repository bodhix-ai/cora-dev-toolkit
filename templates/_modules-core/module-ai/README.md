# UaiUenablementUmodule

CORA-compliant module for managing providers.

## Structure

```
ai-enablement-module/
├── backend/
│   ├── lambdas/
│   │   └── provider/           # CRUD Lambda for providers
│   └── layers/
│       └── module-common/          # Shared utilities
├── frontend/
│   └── src/
│       ├── components/             # React components
│       ├── hooks/                  # Custom hooks
│       └── types/                  # TypeScript types
└── README.md
```

## Features

- ✅ **CORA Compliant**: Uses org_common standard patterns
- ✅ **Multi-Tenant**: All data filtered by org_id
- ✅ **Type Safe**: Full TypeScript support
- ✅ **Secure**: RLS policies enforced
- ✅ **Tested**: Comprehensive test coverage

## Backend API

### Endpoints

```
GET    /providers?orgId=xxx     List providers for organization
GET    /providers/:id           Get provider by ID
POST   /providers               Create new provider
PUT    /providers/:id           Update provider
DELETE /providers/:id           Delete provider
```

### Database Schema

```sql
CREATE TABLE public.provider (
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
ALTER TABLE public.provider ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_org_members_select" ON public.provider
    FOR SELECT
    USING (org_id IN (SELECT org_id FROM public.org_members WHERE person_id = auth.uid() AND active = true));

-- Add other policies for INSERT, UPDATE, DELETE
```

## Frontend Usage

```typescript
import { useUproviders } from '@sts-career/ai-enablement-module-frontend';

function UproviderList() {
  const { providers, loading, error } = useUproviders(orgId);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <List>
      {providers.map(provider => (
        <ListItem key={provider.id}>
          <ListItemText primary={provider.name} />
        </ListItem>
      ))}
    </List>
  );
}
```

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Build backend
cd backend && ./build.sh

# Run frontend
cd frontend && pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run backend tests
pnpm test:backend

# Run frontend tests
pnpm test:frontend
```

### Compliance Checks

```bash
# Check API compliance
python3 scripts/check-api-compliance.py

# Check frontend compliance
pnpm check:frontend
```

## Deployment

This module is deployed as part of the STS Career Stack infrastructure.

See: [docs/deployment/README.md](../../docs/deployment/README.md)

## Generated

This module was generated using the CORA Module Generator:

```bash
./scripts/create-cora-module.sh ai-enablement-module provider
```

**Generated on:** Tue Nov 11 17:03:46 EST 2025
