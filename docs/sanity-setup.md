# Sanity project setup

Join the existing Sanity project. Creating a new one gives you an empty dataset the site does not read.

## Join the existing project

1. Get invited to the existing project in [Sanity manage](https://www.sanity.io/manage).
2. Copy the env examples (see the root README) and fill in the project id, dataset, and a **Viewer** token as `SANITY_API_READ_TOKEN` in `apps/web/.env`.
3. Log in for Studio and for `sanity exec` scripts:

```bash
cd apps/studio
npx sanity@latest login
```

Studio reads `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` from `apps/studio/.env`. It does not need an API token in that file.

## Create a project (only if you are starting over)

From `apps/studio`:

```bash
npx sanity@latest project create transmoderna --dataset <dataset>
```

Note the **project ID** printed by the CLI. Point both `.env` files at that id. The current site content will not come with it.

Do **not** run `sanity init` with a template that overwrites `sanity.config.ts` or `structure.ts`.

### If the dataset does not exist yet

The project can exist without a dataset (for example if `project create` was interrupted). Create it with the dataset name from `.env.example`:

```bash
cd apps/studio
npx sanity@latest dataset create <dataset> -p <your-project-id> --visibility private
npx sanity@latest datasets list -p <your-project-id>
```

Use that same dataset name for `SANITY_STUDIO_DATASET` and `PUBLIC_SANITY_DATASET`.

## Local env files (gitignored)

Copy `apps/studio/.env.example` and `apps/web/.env.example`, then fill in the project id and dataset you were given. `SANITY_API_READ_TOKEN` is required for local page content because the dataset is private. `SANITY_API_WRITE_TOKEN` is only needed once custom sync is implemented.

## API tokens (Sanity manage → API → Tokens)

| Token | Env var | Where |
|-------|---------|--------|
| Viewer | `SANITY_API_READ_TOKEN` | `apps/web` (required for content; dataset is private) |
| Editor | `SANITY_API_WRITE_TOKEN` | `apps/web` (custom sync, not implemented yet) |

Never commit tokens or put write tokens in `PUBLIC_*` variables.

## Verify

```bash
npm run dev:studio
npm run dev:web
```

Studio should load at http://localhost:3333 with your project ID.
