# Sanity project setup

## 1. Login

```bash
cd apps/studio
npx sanity@latest login
```

## 2. Create project

From `apps/studio` (after this monorepo is scaffolded):

```bash
npx sanity@latest project create transmoderna --dataset production
```

Note the **project ID** printed by the CLI.

Do **not** run `sanity init` with a template that overwrites `sanity.config.ts` or `structure.ts`.

### If you see “Dataset production not found”

The project can exist without a dataset (e.g. if `project create` was interrupted). Create it:

```bash
cd apps/studio
npx sanity@latest dataset create production -p <your-project-id> --visibility private
npx sanity@latest datasets list -p <your-project-id>
```

Your `.env` files should use `SANITY_STUDIO_DATASET=production` and `PUBLIC_SANITY_DATASET=production`.

## 3. Local env files (gitignored)

**`apps/studio/.env`**

```env
SANITY_STUDIO_PROJECT_ID=<your-project-id>
SANITY_STUDIO_DATASET=production
```

**`apps/web/.env`** (same project and dataset)

```env
PUBLIC_SANITY_PROJECT_ID=<your-project-id>
PUBLIC_SANITY_DATASET=production
PUBLIC_SANITY_API_VERSION=2026-05-11

SANITY_STUDIO_PROJECT_ID=<your-project-id>
SANITY_STUDIO_DATASET=production
```

Add Shopify and write-token variables from `apps/web/.env.example` when you connect commerce.

## 4. API tokens (Sanity manage → API → Tokens)

| Token | Env var | Where |
|-------|---------|--------|
| Viewer | `SANITY_API_READ_TOKEN` | `apps/web` (preview, server only) |
| Editor | `SANITY_API_WRITE_TOKEN` | `apps/web` (custom sync, server only) |

Never commit tokens or put write tokens in `PUBLIC_*` variables.

## 5. Verify

```bash
npm run dev:studio
npm run dev:web
```

Studio should load at http://localhost:3333 with your project ID.
