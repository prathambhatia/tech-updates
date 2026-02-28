---
name: blog-file-placement
description: Enforce consistent file placement and import conventions in the blog repository. Use when creating, moving, or refactoring files so new code lands in the correct folders, especially when adding type definitions, app routes, components, services, admin code, prisma code, scripts, or utilities.
---

# Blog File Placement

## Overview
Apply this layout before creating files. Keep one canonical location per concern and move files when structure drifts.

## Placement Rules
- Place route files in `app/**` only (`page.tsx`, `layout.tsx`, `loading.tsx`, `route.ts`).
- Place reusable UI in `components/`.
- Place data/business logic in `services/`.
- Place framework/library adapters in `lib/`.
- Place generic helpers in `utils/`.
- Place prisma schema, migrations, and seeds in `prisma/`.
- Place executable maintenance tasks in `scripts/`.
- Place admin-only code in `admin/` unless it is an app route under `app/admin/**`.

## Type File Rules
- Centralize type declarations in `types/`.
- Use domain subfolders under `types/`: `types/app`, `types/components`, `types/services`, `types/lib`, `types/admin`, `types/prisma`.
- Keep shared domain models in top-level `types/*.ts` (for example `types/article.ts`, `types/ingestion.ts`).
- Name files with a clear scope suffix, usually `*.types.ts`.
- Import types through alias paths (`@/types/...`) instead of relative paths crossing domains.

## Placement Map
Read [references/placement-map.md](references/placement-map.md) for the canonical folder-to-file mapping.

## Workflow
1. Identify what the file does (route, component, service, util, model/type, script, admin).
2. Create or move the file to the mapped folder.
3. If it is a type declaration, place it under `types/<domain>/`.
4. Rewrite imports to canonical alias paths.
5. Remove obsolete empty folders left after moves.
6. Run verification scripts (`lint`, `typecheck`, `build`) and fix only root-cause breakages.

## Guardrails
- Do not duplicate equivalent types across multiple folders.
- Do not place component-specific types beside components unless explicitly requested; default to `types/components/`.
- Keep runtime code separate from pure types.
- Prefer minimal moves that improve consistency without changing behavior.
