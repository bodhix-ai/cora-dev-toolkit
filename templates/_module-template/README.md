# Module Name

**Status:** Template/Example  
**Architecture:** CORA (Context-Oriented Resource Architecture)

## Overview

Brief description of what this module does and why it exists.

## ⚠️ Important Standards

### Lambda Route Docstring (REQUIRED)

If your Lambda uses **dynamic routing** (dispatcher pattern), you MUST document routes in the module docstring. See: [Lambda Route Docstring Standard](../../docs/standards/standard_LAMBDA-ROUTE-DOCSTRING.md)

```python
"""
Module Name - Description

Routes - Category:
- GET /path - Description
- POST /path/{id} - Description
"""
```

This enables validation tools to verify API Gateway routes match Lambda handlers.

## Features

- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Architecture

### Components

- **Database**: Tables, functions, and RLS policies for [entity] management
- **Backend**: Lambda functions for CRUD operations
- **Frontend**: React components, hooks, and contexts for UI integration

### Dependencies

#### Module Dependencies

- `org-module` - For multi-tenant organization support and RLS helpers

#### Package Dependencies

- `@supabase/supabase-js` - Database client
- `@okta/okta-react` - Authentication

## Database Schema

### Tables

#### `entity` Table

| Column      | Type         | Description              |
| ----------- | ------------ | ------------------------ |
| id          | UUID         | Primary key              |
| org_id      | UUID         | Organization foreign key |
| name        | VARCHAR(255) | Entity name              |
| description | TEXT         | Entity description       |
| status      | VARCHAR(50)  | Entity status            |
| created_at  | TIMESTAMPTZ  | Creation timestamp       |
| updated_at  | TIMESTAMPTZ  | Last update timestamp    |
| created_by  | UUID         | Creator user ID          |
| updated_by  | UUID         | Last updater user ID     |

### Relationships

- `entity.org_id` → `org.id` (CASCADE DELETE)
- `entity.created_by` → `auth.users.id`
- `entity.updated_by` → `auth.users.id`

### Indexes

- `idx_entity_org_id` ON `entity(org_id)` - Org-scoped queries
- `idx_entity_org_status` ON `entity(org_id, status)` - Filtered queries

### RLS Policies

- **SELECT**: Users can view entities in their organizations
- **INSERT**: Users can create entities in their organizations
- **UPDATE**: Org admins/owners can update entities
- **DELETE**: Org admins/owners can delete entities

## API Endpoints

### GET /api/module/entities

Get all entities for the current organization.

**Authorization:** Required

**Query Parameters:**

- `orgId` (required) - Organization ID
- `status` (optional) - Filter by status
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "name": "Entity Name",
      "description": "Entity description",
      "status": "active",
      "created_at": "2025-01-03T12:00:00Z",
      "updated_at": "2025-01-03T12:00:00Z",
      "created_by": "uuid",
      "updated_by": "uuid"
    }
  ]
}
```

### POST /api/module/entities

Create a new entity.

**Authorization:** Required

**Request Body:**

```json
{
  "org_id": "uuid",
  "name": "Entity Name",
  "description": "Entity description",
  "status": "active"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Entity Name",
    "description": "Entity description",
    "status": "active",
    "created_at": "2025-01-03T12:00:00Z"
  }
}
```

### GET /api/module/entities/:id

Get a specific entity.

**Authorization:** Required

**Response:** Same as POST response

### PUT /api/module/entities/:id

Update an entity.

**Authorization:** Required (org admin/owner)

**Request Body:**

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "inactive"
}
```

**Response:** Same as POST response

### DELETE /api/module/entities/:id

Delete an entity.

**Authorization:** Required (org admin/owner)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid"
  }
}
```

## Frontend Components

### Components

- `EntityList` - Display list of entities
- `EntityCard` - Display single entity card
- `EntityForm` - Create/edit entity form
- `EntityDetails` - Display entity details

### Hooks

- `useEntity(orgId)` - Fetch and manage entities
- `useEntityForm()` - Form state management

### Contexts

- `EntityContext` - Global entity state

## Installation

### Database Setup

Apply schema files in order:

```bash
psql $DATABASE_URL -f packages/module-name/db/schema/001-entity-table.sql
psql $DATABASE_URL -f packages/module-name/db/schema/002-apply-rls.sql
```

### Backend Deployment

Deploy Lambda layer:

```bash
cd packages/module-name/backend/layers/module-common
zip -r module-common.zip python/
aws lambda publish-layer-version \
  --layer-name module-common \
  --zip-file fileb://module-common.zip
```

Deploy Lambda functions:

```bash
cd packages/module-name/backend/lambdas/entity
zip -r function.zip lambda_function.py
aws lambda create-function \
  --function-name module-entity \
  --runtime python3.11 \
  --zip-file fileb://function.zip \
  --handler lambda_function.lambda_handler
```

### Frontend Integration

Import components in your app:

```typescript
import { EntityList, useEntity } from "@/packages/module-name/frontend";

function MyComponent() {
  const { entities, loading } = useEntity(orgId);

  return <EntityList entities={entities} loading={loading} />;
}
```

## Usage Examples

### Create an Entity

```typescript
import { useEntity } from "@/packages/module-name/frontend";

function CreateEntity() {
  const { createEntity } = useEntity(orgId);

  const handleCreate = async () => {
    await createEntity({
      name: "New Entity",
      description: "Description",
      status: "active",
    });
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

### List Entities

```typescript
import { EntityList } from "@/packages/module-name/frontend";

function MyPage() {
  return <EntityList orgId={currentOrgId} />;
}
```

### Update an Entity

```typescript
const { updateEntity } = useEntity(orgId);

await updateEntity(entityId, {
  name: "Updated Name",
  status: "inactive",
});
```

## Testing

### Run Database Tests

```bash
psql $DATABASE_URL -f packages/module-name/db/tests/test_rls_policies.sql
```

### Run Lambda Tests

```bash
cd packages/module-name/backend/lambdas/entity
pytest test_lambda_function.py
```

### Run Frontend Tests

```bash
cd packages/module-name/frontend
npm test
```

## Configuration

### Environment Variables

**Backend:**

- `AWS_REGION` - AWS region (default: us-east-1)
- `CLUSTER_ARN` - RDS cluster ARN
- `SECRET_ARN` - Secrets Manager ARN
- `DATABASE_NAME` - Database name
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service key

**Frontend:**

- `NEXT_PUBLIC_API_URL` - API base URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

## Development

### Local Setup

1. Clone repository
2. Install dependencies
3. Set up environment variables
4. Apply database schema
5. Run tests

### Adding New Features

1. Update database schema if needed
2. Update Lambda functions
3. Update frontend components
4. Add tests
5. Update documentation

## Troubleshooting

### Common Issues

**Issue:** RLS policies blocking access

**Solution:** Verify user has correct role in organization

**Issue:** Lambda function timing out

**Solution:** Check database connection and query performance

**Issue:** Frontend not loading data

**Solution:** Verify API endpoints and authentication

## License

MIT

## Support

For questions or issues, refer to the CORA documentation or community forums.

---

**Module Version History:**

- v1.0.0 (2025-01-03): Initial implementation
