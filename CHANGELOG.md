# CORA Toolkit Changelog

All notable changes to the CORA Development Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Version tracking system for toolkit and modules
- Module dependency tracking in module-registry.yaml
- Project version snapshots (.cora-version.yaml)
- Sync logging for upgrade traceability
- Admin route standardization (in progress)

## [0.1.0] - 2026-01-27

### Added
- Initial toolkit release with versioning system
- Core modules: access, ai, ws, mgmt, kb, chat
- Functional modules: eval, voice
- Comprehensive validation framework:
  - Admin authentication validator
  - Admin route validator
  - API response validator
  - API tracer (Lambda route documentation)
  - Audit column validator
  - Database naming validator
  - Frontend compliance validator
  - Import validator
  - Module toggle validator
  - NextJS routing validator
  - Portability validator
  - Role naming validator
  - RPC function validator
  - Schema validator
  - Structure validator
  - TypeScript validator
  - UI library validator
  - Workspace plugin validator
- Project creation scripts (create-cora-project.sh)
- Module development templates
- Architecture Decision Records (ADRs 1-18)
- Comprehensive standards documentation
- Fast iteration testing workflow (sync-fix-to-project.sh)

### Standards Established
- ADR-015: Admin Page Auth Pattern + Breadcrumb Navigation
- ADR-016: Org Admin Page Authorization
- ADR-017: WS Plugin Architecture
- ADR-018: API Route Structure
- ADR-018b: API Gateway Route Standards
- Database naming standard (ADR-011)
- Module toggle pattern
- Lambda deployment standard
- Versioning standard

### Infrastructure
- Two-repo pattern (infra + stack)
- Terraform-based deployment
- Lambda build and deployment scripts
- Database migration framework
- Module registry system

[unreleased]: https://github.com/bodhix-ai/cora-dev-toolkit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bodhix-ai/cora-dev-toolkit/releases/tag/v0.1.0