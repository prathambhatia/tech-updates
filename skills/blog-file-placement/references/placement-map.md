# Placement Map

## Canonical Locations
- `app/**`: Next.js routes and route-local UI entry files.
- `components/**`: Reusable UI components.
- `services/**`: Domain/business logic, orchestration, scoring, ingestion.
- `lib/**`: Integrations and infrastructure helpers.
- `utils/**`: Generic pure helpers.
- `types/**`: All type declarations grouped by domain.
- `admin/**`: Admin-specific non-route modules.
- `prisma/**`: Database schema, migrations, seed scripts.
- `scripts/**`: Operational and backfill scripts.

## Type Subfolders
- `types/app/**`: Route prop and app-layer types.
- `types/components/**`: Props and component-local DTO types.
- `types/services/**`: Service input/output and record types.
- `types/lib/**`: Library adapter and integration types.
- `types/admin/**`: Admin domain types.
- `types/prisma/**`: Seed and prisma-adjacent types.
- `types/*.ts`: Shared cross-domain models.

## Import Pattern
- Use `@/types/<domain>/<file>.types` for domain types.
- Use `@/types/<shared>.ts` for shared models.
