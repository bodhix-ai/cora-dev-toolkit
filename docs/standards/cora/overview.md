# Architecture Overview

## Introduction

The STS Career Application uses **CORA (Context-Oriented Resource Architecture)**, a modular framework for building AI-powered applications with multi-tenant data isolation, comprehensive security, and rapid development.

CORA is a module-first architecture where:

- **Modules** (`packages/*/`) are self-contained units with DB + Backend + Frontend
- **Apps** (`apps/*/`) are thin composition layers that import from modules
- **Infrastructure** (`sts-career-infra/`) provisions AWS resources using module outputs

## High-Level Architecture

### CORA Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CORA Architecture                       │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│           Packages (Self-Contained Modules)                │
├────────────────────────────────────────────────────────────┤
│ packages/org-module/              # Foundation module      │
│ ├── db/                           # Multi-tenant schema    │
│ │   ├── schema/                   # SQL files with RLS     │
│ │   └── migrations/               # Schema changes         │
│ ├── backend/                      # Lambda functions       │
│ │   ├── layers/org-common/        # Shared utilities       │
│ │   └── lambdas/                  # 4 Lambda functions     │
│ │       ├── identities-management/# User provisioning      │
│ │       ├── profiles/             # Profile CRUD           │
│ │       ├── orgs/                 # Organization CRUD      │
│ │       └── members/              # Membership management  │
│ ├── frontend/                     # React components       │
│ │   ├── components/               # Sidebar, Dashboard     │
│ │   ├── hooks/                    # useProfile, useOrgs    │
│ │   ├── contexts/                 # UserContext, OrgContext│
│ │   └── index.ts                  # Barrel export          │
│ └── infrastructure/               # Terraform config       │
│     ├── main.tf                   # Lambda + IAM           │
│     └── outputs.tf                # API routes export      │
│                                                             │
│ packages/resume-module/           # Feature module (TBD)   │
│ packages/cert-module/             # Feature module (TBD)   │
│ packages/campaign-module/         # Feature module (TBD)   │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│              Apps (Composition Layer)                      │
├────────────────────────────────────────────────────────────┤
│ apps/frontend/                                             │
│ ├── app/                          # Next.js routes         │
│ │   ├── layout.tsx                # Imports Sidebar from   │
│ │   │                             # @org-module/frontend   │
│ │   └── page.tsx                  # Imports Dashboard      │
│ └── src/                          # Feature-specific code  │
│                                                             │
│ apps/backend/                                              │
│ └── (minimal or non-existent - modules provide Lambdas)   │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│          Infrastructure (AWS Resources)                    │
├────────────────────────────────────────────────────────────┤
│ sts-career-infra/terraform/environments/dev/main.tf       │
│ ├── module "org_module" {                                 │
│ │     source = "../../../sts-career-stack/packages/       │
│ │               org-module/infrastructure"                 │
│ │   }                                                      │
│ ├── Dynamically creates API Gateway routes from module    │
│ └── Provisions Lambda functions from module outputs       │
└────────────────────────────────────────────────────────────┘
```

### System Components (Deployment View)

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser]
    end

    subgraph "Authentication"
        B[Okta SSO]
    end

    subgraph "CDN Layer"
        C[CloudFront CDN]
        D[S3 Static Assets]
    end

    subgraph "API Layer"
        E[API Gateway]
        F[Custom Authorizer]
    end

    subgraph "CORA Modules (Lambda Functions)"
        G1[Org-Module Lambdas]
        G2[Resume-Module Lambdas]
        G3[Cert-Module Lambdas]
        G4[Campaign-Module Lambdas]
    end

    subgraph "AI/ML Layer"
        K[AWS Bedrock<br/>Claude 3.5 Haiku<br/>Claude 3.7 Sonnet]
    end

    subgraph "Data Layer"
        L[Supabase PostgreSQL<br/>with RLS]
        M[S3 Document Storage]
    end

    subgraph "External Services"
        N[Credly API]
        O[Jira API]
    end

    A -->|OIDC/OAuth 2.0| B
    B -->|JWT Token| A
    A -->|HTTPS| C
    C -->|Fetch Static Assets| D
    A -->|REST API + JWT| E
    E -->|Validate Token| F
    F -->|IAM Policy| E
    E -->|Invoke| G1
    E -->|Invoke| G2
    E -->|Invoke| G3
    E -->|Invoke| G4
    M -->|S3 Events| G2
    G1 -->|Query/Insert| L
    G2 -->|Query/Insert| L
    G3 -->|Query/Insert| L
    G4 -->|Query/Insert| L
    G2 -->|Invoke Model| K
    G3 -->|Invoke Model| K
    K -->|JSON Response| G2
    K -->|JSON Response| G3
    G2 -->|Store Results| M
    G3 -->|Store Results| M
    G3 -->|HTTP API| N
    G1 -->|HTTP API| O

    style B fill:#FF6B6B
    style K fill:#4ECDC4
    style L fill:#95E1D3
    style M fill:#95E1D3
    style G1 fill:#FFD93D
    style G2 fill:#FFD93D
    style G3 fill:#FFD93D
    style G4 fill:#FFD93D
```

### Architecture Principles

1. **Module-First Development**: Every feature is a self-contained module with database + backend + frontend
2. **Apps as Composition Layers**: `apps/` directories import and compose modules, containing minimal original code
3. **Multi-Tenant by Default**: All data is organization-scoped with Row-Level Security (RLS)
4. **Infrastructure as Module Outputs**: Modules provide Terraform configuration; main infrastructure imports and composes
5. **Serverless-First**: No server management, automatic scaling, pay-per-use
6. **Event-Driven**: Asynchronous processing via S3 events
7. **API-Centric**: RESTful API with centralized authentication
8. **AI-Powered**: Intelligent document extraction via AWS Bedrock

## Module Reusability

CORA modules are designed to be reusable across multiple AI applications:

1. Copy `packages/org-module/` to a new AI app
2. Deploy infrastructure: `terraform apply`
3. Import components: `import { Sidebar } from '@org-module/frontend'`
4. Instant: Authentication, Multi-tenancy, User Management

**Benefits:**

- **Rapid Prototyping**: Pre-built foundation (auth, multi-tenancy, audit)
- **Consistency**: Same patterns across all applications
- **Maintenance**: Fix once, benefit everywhere
- **Marketplace Potential**: Modules could be shared/sold as packages

See [CORA Principles](./cora-principles.md) for detailed architecture philosophy.

## Technology Stack

### Foundation Module (org-module)

- **Database**: PostgreSQL with RLS (via Supabase)
- **Backend**: Python 3.13 Lambda functions
- **Frontend**: React components with TypeScript
- **Auth**: Okta SSO + JWT validation
- **Infrastructure**: Terraform 1.5+

### Feature Modules (Planned)

- **resume-module**: Resume management with AI extraction
- **cert-module**: Certification tracking with Credly integration
- **campaign-module**: Certification campaign management
- **document-module**: Document processing and storage

### Composition Layer (apps/)

- **Frontend**: Next.js 14+ with Material-UI v5+
- **Backend**: Minimal or non-existent (modules provide Lambdas)

### Shared Services

| Layer          | Technology        | Version | Purpose                |
| -------------- | ----------------- | ------- | ---------------------- |
| **Frontend**   | Next.js           | 14+     | React framework        |
|                | Material-UI       | 5+      | UI components          |
|                | TypeScript        | 5+      | Type safety            |
|                | React Hook Form   | -       | Form management        |
| **Backend**    | Python            | 3.13    | Lambda runtime         |
|                | AWS Lambda        | -       | Serverless compute     |
|                | API Gateway       | -       | REST API               |
| **Database**   | PostgreSQL        | 16+     | Relational database    |
|                | Supabase          | -       | Managed PostgreSQL     |
|                | RLS               | -       | Multi-tenant isolation |
| **Storage**    | S3                | -       | Document storage       |
| **AI/ML**      | AWS Bedrock       | -       | AI processing          |
|                | Claude 3.5 Haiku  | -       | Resume extraction      |
|                | Claude 3.7 Sonnet | -       | Certificate extraction |
| **Auth**       | Okta              | -       | SSO/OIDC               |
| **IaC**        | Terraform         | 1.5+    | Infrastructure         |
| **Monitoring** | CloudWatch        | -       | Logs & metrics         |

## Component Architecture

### Frontend Architecture (Module-Based)

```mermaid
graph TB
    subgraph "CORA Modules (packages/*/frontend/)"
        M1[org-module/frontend]
        M2[resume-module/frontend]
        M3[cert-module/frontend]

        M1 --> C1[Sidebar Component]
        M1 --> C2[Dashboard Component]
        M1 --> H1[useProfile Hook]
        M1 --> H2[useOrganizations Hook]
        M1 --> X1[UserContext]
        M1 --> X2[OrgContext]

        M2 --> C3[ResumeList Component]
        M2 --> C4[ResumeEditor Component]
        M2 --> H3[useResumes Hook]

        M3 --> C5[CertList Component]
        M3 --> H4[useCertifications Hook]
    end

    subgraph "Apps (Composition Layer)"
        A[apps/frontend/app/layout.tsx]
        B[apps/frontend/app/page.tsx]

        A -->|import| C1
        A -->|import| X1
        A -->|import| X2
        B -->|import| C2
    end

    style M1 fill:#FFD93D
    style M2 fill:#FFD93D
    style M3 fill:#FFD93D
```

**Key Concept:** Most components live in `packages/*/frontend/`. Apps import and compose them.

### Backend Architecture (Module-Based)

```mermaid
graph TB
    subgraph "Org-Module Backend"
        O1[identities-management/]
        O2[profiles/]
        O3[orgs/]
        O4[members/]
        OL[org-common/ Layer]

        O1 --> OL
        O2 --> OL
        O3 --> OL
        O4 --> OL
    end

    subgraph "Resume-Module Backend"
        R1[process-resume-doc/]
        R2[process-resume-json/]
        R3[resume-crud/]
        RL[resume-common/ Layer]

        R1 --> RL
        R2 --> RL
        R3 --> RL
    end

    subgraph "Cert-Module Backend"
        C1[process-cert-doc/]
        C2[cert-crud/]
        C3[credly-sync/]
        CL[cert-common/ Layer]

        C1 --> CL
        C2 --> CL
        C3 --> CL
    end

    subgraph "Infrastructure"
        I[API Gateway]
        I --> O1
        I --> O2
        I --> O3
        I --> O4
        I --> R1
        I --> R2
        I --> R3
        I --> C1
        I --> C2
        I --> C3
    end

    style O1 fill:#FFD93D
    style O2 fill:#FFD93D
    style O3 fill:#FFD93D
    style O4 fill:#FFD93D
    style R1 fill:#95E1D3
    style R2 fill:#95E1D3
    style R3 fill:#95E1D3
    style C1 fill:#4ECDC4
    style C2 fill:#4ECDC4
    style C3 fill:#4ECDC4
```

**Key Concept:** Lambda functions are organized by module, each with its own shared layer.

## Data Flow Diagrams

### Resume Upload & Processing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant RM as Resume-Module<br/>Lambda
    participant S3 as S3 Bucket
    participant AI as AWS Bedrock
    participant DB as Supabase PostgreSQL

    U->>FE: Upload Resume (Word/PDF)
    FE->>FE: Convert to Base64
    FE->>API: POST /resumes/upload + base64
    API->>RM: Invoke resume-upload Lambda
    RM->>RM: Decode base64
    RM->>S3: Save to uploaded/ prefix
    RM->>API: Success response
    API->>FE: 200 OK
    FE->>U: Upload successful

    Note over S3,RM: S3 Event Notification
    S3->>RM: Trigger process-resume-doc
    RM->>S3: GetObject (document)
    RM->>AI: Invoke Claude 3.5 Haiku<br/>Extract resume JSON
    AI->>RM: Structured JSON response
    RM->>S3: PutObject json_files/ prefix

    Note over S3,RM: S3 Event Notification
    S3->>RM: Trigger process-resume-json
    RM->>S3: GetObject (JSON)
    RM->>RM: Validate structure
    RM->>DB: INSERT/UPDATE resume (with org_id)
    RM->>DB: INSERT skills (with org_id)
    RM->>DB: INSERT certifications (with org_id)

    Note over DB: RLS policies enforce<br/>org_id isolation

    U->>FE: View processed resume
    FE->>API: GET /resumes
    API->>RM: Invoke resume-crud Lambda
    RM->>DB: Query WHERE org_id = current_org
    DB->>RM: Resume + skills + certs
    RM->>API: Response
    API->>FE: 200 + JSON
    FE->>U: Display resume
```

### Multi-Tenant Data Isolation Flow

```mermaid
sequenceDiagram
    participant U as User (Org A)
    participant FE as Frontend
    participant API as API Gateway
    participant Auth as Custom Authorizer
    participant OM as Org-Module<br/>Lambda
    participant DB as Supabase PostgreSQL

    U->>FE: Login via Okta
    FE->>API: GET /profiles/me
    API->>Auth: Validate JWT
    Auth->>Auth: Extract user_id
    Auth->>API: Allow + context {user_id}

    API->>OM: Invoke profiles Lambda
    OM->>OM: Set session user_id
    OM->>DB: Query profiles (RLS enabled)

    Note over DB: RLS Policy:<br/>WHERE can_access_org_data(org_id)

    DB->>DB: Filter WHERE org_id IN<br/>(user's orgs)
    DB->>OM: Profile (Org A only)
    OM->>API: Response
    API->>FE: 200 + Profile
    FE->>U: Display profile

    Note over U,DB: User CANNOT access Org B data<br/>RLS enforced at database level
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant Okta as Okta SSO
    participant APIG as API Gateway
    participant Auth as Custom Authorizer
    participant Lambda as Module Lambda
    participant DB as Supabase PostgreSQL

    U->>FE: Access application
    FE->>Okta: Redirect to login
    Okta->>U: Present login page
    U->>Okta: Enter credentials
    Okta->>Okta: Validate credentials
    Okta->>FE: Redirect with auth code
    FE->>Okta: Exchange code for tokens
    Okta->>FE: JWT access token + ID token
    FE->>FE: Store tokens

    Note over FE,Lambda: API Request

    FE->>APIG: GET /profiles/me<br/>Authorization: Bearer <JWT>
    APIG->>Auth: Invoke authorizer
    Auth->>Auth: Extract JWT from header
    Auth->>Okta: Validate token (JWKS)
    Okta->>Auth: Token valid + user claims
    Auth->>Auth: Extract user ID, email, roles
    Auth->>APIG: IAM Allow Policy + context
    Note over APIG: Context: {userId, email, roles}

    APIG->>Lambda: Invoke with user context
    Lambda->>Lambda: Extract userId from context
    Lambda->>DB: Set session user_id
    Lambda->>DB: Query (RLS enforces org_id)
    DB->>Lambda: User's org data only
    Lambda->>APIG: Response
    APIG->>FE: 200 + JSON
    FE->>U: Display data
```

### Security Layers

```mermaid
graph TB
    subgraph "Perimeter Security"
        A[CloudFront]
        B[WAF Rules]
    end

    subgraph "Application Security"
        C[API Gateway]
        D[Custom Authorizer]
        E[CORS Configuration]
    end

    subgraph "Function Security"
        F[IAM Execution Roles]
        G[Resource-Based Policies]
    end

    subgraph "Data Security"
        I[Secrets Manager]
        J[PostgreSQL Encryption at Rest]
        K[S3 Encryption]
        L[TLS in Transit]
        M[Row-Level Security RLS]
    end

    subgraph "Identity & Access"
        N[Okta SSO]
        O[JWT Tokens]
        P[IAM Policies]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    D --> N
    N --> O
    C --> F
    F --> P
    F --> G
    F --> I
    I --> J
    I --> K
    M --> J

    style B fill:#FF6B6B
    style I fill:#95E1D3
    style M fill:#FF6B6B
    style N fill:#FF6B6B
```

**Security Controls:**

1. **Network Security**:

   - CloudFront HTTPS only
   - WAF rules (SQL injection, XSS, rate limiting)
   - Security groups restricting traffic

2. **Authentication**:

   - Okta SSO (OIDC/OAuth 2.0)
   - JWT token validation
   - Short token TTL with refresh

3. **Authorization**:

   - Custom authorizer validates every request
   - User context propagated to Lambdas
   - **Row-Level Security (RLS)** enforces multi-tenancy at database level
   - Role-based admin access

4. **Data Protection**:

   - PostgreSQL encryption at rest (AES-256)
   - S3 encryption (SSE-S3)
   - TLS 1.2+ in transit
   - Secrets Manager for credentials
   - **RLS policies prevent cross-org data access**

5. **IAM Security**:
   - Least privilege Lambda execution roles
   - Resource-based policies
   - No long-term credentials

## Deployment Architecture

### Environment Structure

```mermaid
graph TB
    subgraph "Environments"
        subgraph "Development (dev)"
            D1[API Gateway dev]
            D2[Module Lambdas dev]
            D3[Supabase dev]
            D4[S3 Bucket dev]
        end

        subgraph "Test (tst)"
            T1[API Gateway tst]
            T2[Module Lambdas tst]
            T3[Supabase tst]
            T4[S3 Bucket tst]
        end

        subgraph "Staging (stg)"
            S1[API Gateway stg]
            S2[Module Lambdas stg]
            S3[Supabase stg]
            S4[S3 Bucket stg]
        end

        subgraph "Production (prd)"
            P1[API Gateway prd]
            P2[Module Lambdas prd]
            P3[Supabase prd]
            P4[S3 Bucket prd]
        end
    end

    subgraph "Shared Services"
        O[Okta SSO]
        B[AWS Bedrock]
        CR[Credly API]
        JR[Jira API]
    end

    D2 --> O
    T2 --> O
    S2 --> O
    P2 --> O

    D2 --> B
    T2 --> B
    S2 --> B
    P2 --> B

    D2 --> CR
    T2 --> CR
    S2 --> CR
    P2 --> CR

    style P1 fill:#FF6B6B
    style P2 fill:#FF6B6B
    style P3 fill:#FF6B6B
    style P4 fill:#FF6B6B
```

### Module Deployment Flow

```mermaid
graph LR
    A[Developer] -->|Update Module| B[packages/my-module/]
    B -->|Build Backend| C[Lambda .zip files]
    B -->|Apply Schema| D[Supabase PostgreSQL]
    B -->|Deploy Infra| E[Terraform Apply]
    E -->|Create| F[Lambda Functions]
    E -->|Create| G[API Gateway Routes]
    E -->|Output| H[api_routes]
    H -->|Import| I[Main Infrastructure]
    I -->|Register| G

    style B fill:#FFD93D
```

**Key Points:**

- Each module deploys independently
- Main infrastructure imports module outputs
- API routes dynamically created from module definitions
- Database schema applied in dependency order (org-module first)

## Performance Architecture

### Lambda Performance Optimization

```mermaid
graph LR
    subgraph "Cold Start Optimization"
        A[256MB+ Memory]
        B[Lazy Library Loading]
    end

    subgraph "Execution Optimization"
        E[Supabase Connection Pooling]
        F[Database Indexes]
        G[Efficient Queries]
        H[Result Pagination]
    end

    subgraph "Caching Strategy"
        I[API Gateway Cache]
        J[CloudFront Cache]
        K[Database Query Cache]
    end

    A --> B
    E --> F
    F --> G
    G --> H

    style E fill:#4ECDC4
```

**Performance Targets:**

- **API Response Time**: < 500ms (p95)
- **Document Processing**: < 30s (resume), < 15s (certificate)
- **Cold Start**: < 2s (CRUD), < 5s (processing)
- **Database Queries**: < 100ms (simple), < 500ms (complex)

### Scalability

```mermaid
graph TB
    subgraph "Auto-Scaling Components"
        A[Lambda: 0-1000 concurrent]
        B[Supabase: Auto-scale]
        C[API Gateway: Unlimited requests]
    end

    subgraph "Limits & Throttling"
        D[Lambda Reserved Concurrency]
        E[Supabase Connection Limits]
        F[API Gateway Throttle]
    end

    A --> D
    B --> E
    C --> F

    style A fill:#95E1D3
    style B fill:#95E1D3
    style C fill:#95E1D3
```

**Scalability Characteristics:**

- **Lambda Functions**: Automatically scale to 1,000 concurrent executions
- **Supabase**: Auto-scales based on load
- **API Gateway**: No hard limit, burst to 5,000 req/s
- **S3**: Unlimited storage, 3,500 PUT/s per prefix

## Disaster Recovery

### Backup Strategy

```mermaid
graph LR
    subgraph "Database Backups"
        A[Supabase Automated Backups]
        B[Point-in-Time Recovery]
        C[Daily Snapshots]
    end

    subgraph "Document Backups"
        E[S3 Versioning]
        F[Cross-Region Replication]
    end

    subgraph "Infrastructure Backups"
        G[Terraform State in S3]
        H[Git Repository]
    end

    A --> B
    A --> C
    E --> F

    style A fill:#95E1D3
    style E fill:#95E1D3
```

**Recovery Objectives:**

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 5 minutes (Supabase PITR)
- **Backup Frequency**: Continuous (Supabase), versioned (S3)

## Monitoring & Observability

### Monitoring Architecture

```mermaid
graph TB
    subgraph "Metrics Collection"
        A[CloudWatch Metrics]
        B[Lambda Logs]
        C[API Gateway Logs]
        D[Supabase Metrics]
    end

    subgraph "Alerting (Planned)"
        E[CloudWatch Alarms]
        F[SNS Topics]
        G[Email/Slack]
    end

    subgraph "Dashboards (Planned)"
        H[CloudWatch Dashboard]
        I[Application Metrics]
        J[Infrastructure Metrics]
    end

    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
    A --> H
    B --> H
    C --> H
    D --> H
    H --> I
    H --> J

    style E fill:#FFD93D
    style H fill:#FFD93D
```

**Key Metrics:**

- Lambda duration, errors, throttles, concurrent executions
- API Gateway 4xx/5xx errors, latency, request count
- Supabase CPU, connections, query performance
- S3 bucket size, request count

## Next Steps

See additional architecture documentation:

- [CORA Principles](./cora-principles.md) - Detailed architecture philosophy
- [Backend Architecture](./backend.md) - Module backend patterns
- [Frontend Architecture](./frontend.md) - Module frontend patterns
- [Database Architecture](./database.md) - Multi-tenant schema design
- [Module Integration Spec](./module-integration-spec.md) - Technical specification
- [Creating Modules Guide](../development/creating-modules.md) - Step-by-step guide
