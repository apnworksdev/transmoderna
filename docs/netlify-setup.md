# Netlify setup (monorepo)

Create **two** Netlify sites from this repository.

## 1) Web (`www.transmoderna.com` or your domain)

| Setting | Value |
|---------|--------|
| Base directory | `apps/web` |
| Build command | `cd ../.. && npm install --include=optional && npm run build --workspace web` |
| Publish directory | `dist` |

Or rely on [`apps/web/netlify.toml`](../apps/web/netlify.toml).

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

## 2) Studio (`studio.transmoderna.com` or subdomain)

| Setting | Value |
|---------|--------|
| Base directory | `apps/studio` |
| Build command | `npm run build` |
| Publish directory | `dist` |

### Studio environment variables

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET` (typically `production`)
