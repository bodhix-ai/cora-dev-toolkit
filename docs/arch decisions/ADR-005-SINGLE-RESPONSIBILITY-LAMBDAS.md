# ADR-005: Single Responsibility Principle for Backend Lambda Functions

**Date:** 2025-11-05

**Status:** Accepted

## Context

As we develop more modules within the CORA framework, a consistent architectural pattern for our serverless backend is crucial. A key decision is how to structure our AWS Lambda functions in relation to the API endpoints they serve. Two primary approaches were considered:

1.  **Monolithic Lambda:** A single Lambda function per module that contains all the business logic for that module. API Gateway routes various paths (e.g., `/campaigns`, `/commitments`) to this single function.
2.  **Single Responsibility Lambda:** A separate, dedicated Lambda function for each resource or closely related group of actions (e.g., a `campaigns-handler`, a `commitments-handler`).

## Decision

We have decided to adopt the **Single Responsibility Lambda** pattern for all CORA modules. Each distinct resource (e.g., Certifications, Commitments, Resumes) within a module should have its own dedicated Lambda function.

## Rationale

This decision is based on the following key principles that align with the overall goals of CORA:

1.  **Security (Principle of Least Privilege):** This is the most critical factor. With separate Lambdas, each function can be assigned a highly restrictive IAM role with permissions to access _only_ the specific database tables and resources it needs. A monolithic Lambda would require a broad set of permissions, increasing the potential blast radius of a security vulnerability.

2.  **Scalability and Performance:** Each function scales independently based on its specific traffic. This is more efficient and cost-effective than scaling a large, monolithic function for all requests. It can also lead to better performance and lower cold start times due to smaller deployment packages.

3.  **Maintainability:** Smaller, focused functions are easier to understand, test, debug, and update. This aligns with the CORA goal of creating self-contained, manageable modules. Developers can work on the `commitments` logic without needing to understand or risk impacting the `campaigns` logic.

4.  **Deployment Independence:** We can deploy updates to a single resource's logic without requiring a full-module deployment, leading to faster and safer release cycles.

## Consequences

- **Increased Initial Setup:** This approach requires more initial setup for each module (more Lambda definitions in Terraform, more IAM roles). However, this can be heavily mitigated by creating a standardized module template.
- **Code Sharing via Lambda Layers:** To avoid code duplication for common logic (e.g., database connections, utilities), we will use AWS Lambda Layers. This requires a defined process for creating and versioning these layers.

By standardizing on this pattern, we are prioritizing security and long-term maintainability, which are core tenets of the CORA framework.
