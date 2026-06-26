# Netlify setup (monorepo)

Create **two** Netlify sites from this repository.

Netlify runs the build from the **repository root** (`/opt/build/repo`) even when `packagePath` / base directory is set to `apps/web` or `apps/studio`. Do **not** use `cd ../..` in build commands — that escapes the checkout and fails with `EACCES`.

Or rely on [`apps/web/netlify.toml`](../apps/web/netlify.toml) / [`apps/studio/netlify.toml`](../apps/studio/netlify.toml).

## 1) Web (`www.transmoderna.com` or your domain)

| Setting | Value |
|---------|--------|
| Base / package directory | `apps/web` (or leave empty — `netlify.toml` paths are repo-root relative) |
| Build command | *(from `apps/web/netlify.toml`)* `npm install --include=optional && npm run build --workspace web` |
| Publish directory | `apps/web/dist` |

### Web environment variables

**Public (Astro `PUBLIC_*`)**

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET` (typically `production`)
- `PUBLIC_SANITY_API_VERSION` (e.g. `2026-05-11`)
- `PUBLIC_SHOPIFY_DOMAIN`
- `PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `PUBLIC_SHOPIFY_MARKET_COUNTRY` (optional)

**Server only (never `PUBLIC_`)**

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`
- `SANITY_API_WRITE_TOKEN`
- `SANITY_STUDIO_SHOPIFY_DOMAIN`
- `SANITY_STUDIO_SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SANITY_API_READ_TOKEN` (preview)

**Sanity Connect custom sync URL:** `https://<your-domain>/api/shopify-sync`

### Secrets scanning

Netlify scans build output for secret-like values. Astro inlines `PUBLIC_*` vars (and server tokens into SSR function bundles), so the deploy can fail even when the build succeeds. [`apps/web/netlify.toml`](../apps/web/netlify.toml) sets `SECRETS_SCAN_OMIT_KEYS` for the env vars this app uses at build time. Do not commit real tokens — keep them in Netlify **Site settings → Environment variables** only.

## 2) Studio (`studio.transmoderna.com` or subdomain)

| Setting | Value |
|---------|--------|
| Base / package directory | `apps/studio` |
| Build command | *(from `apps/studio/netlify.toml`)* `npm install && npm run build --workspace studio` |
| Publish directory | `apps/studio/dist` |

### Studio environment variables

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET` (typically `production`)
