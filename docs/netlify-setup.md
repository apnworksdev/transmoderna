# Netlify setup (monorepo)

Create **two** Netlify sites from this repository.

Netlify runs the build from the **repository root** (`/opt/build/repo`) even when `packagePath` / base directory is set to `apps/web` or `apps/studio`. Do **not** use `cd ../..` in build commands — that escapes the checkout and fails with `EACCES`.

Or rely on [`apps/web/netlify.toml`](../apps/web/netlify.toml) / [`apps/studio/netlify.toml`](../apps/studio/netlify.toml).

## 1) Web (`www.transmoderna.net` or your domain)

| Setting | Value |
|---------|--------|
| Base / package directory | `apps/web` (or leave empty — `netlify.toml` paths are repo-root relative) |
| Build command | *(from `apps/web/netlify.toml`)* `npm install --include=optional && npm run build --workspace web` |
| Publish directory | `apps/web/dist` |

### Web environment variables

**Public (Astro `PUBLIC_*`)**

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `PUBLIC_SANITY_API_VERSION` (`2025-08-15`)
- `PUBLIC_SHOPIFY_DOMAIN`
- `PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`

**Server only (never `PUBLIC_`)**

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`
- `SANITY_API_WRITE_TOKEN`
- `SANITY_STUDIO_SHOPIFY_DOMAIN`
- `SANITY_API_READ_TOKEN` (required: dataset is private)
- `SHOPIFY_SYNC_SECRET` (shared secret for `POST /api/shopify-sync`)

**Sanity Connect custom sync URL:** leave unset. `https://<your-domain>/api/shopify-sync` still returns 501 after the secret check. See [shopify-setup.md](shopify-setup.md).

### Domains and shop redirect

1. In Netlify **Domain management**, add `www.transmoderna.net`, apex `transmoderna.net`, and `shop.transmoderna.net`.
2. Set the primary domain to `www.transmoderna.net` (matches `site` in `apps/web/astro.config.mjs`).
3. Have DNS for those hostnames pointed at this Netlify site.

[`apps/web/netlify.toml`](../apps/web/netlify.toml) already 301-redirects `https://shop.transmoderna.net/*` (and `http://…`) → `https://www.transmoderna.net/shop/:splat` via Netlify domain-level redirects. That only works after the shop subdomain is both added in Netlify and pointed via DNS.

### Secrets scanning

Netlify scans build output for secret-like values. Astro inlines `PUBLIC_*` vars (and server tokens into SSR function bundles), so the deploy can fail even when the build succeeds. [`apps/web/netlify.toml`](../apps/web/netlify.toml) sets `SECRETS_SCAN_OMIT_KEYS` for the env vars this app uses at build time. Do not commit real tokens — keep them in Netlify **Site settings → Environment variables** only.

## 2) Studio (`studio.transmoderna.net` or subdomain)

| Setting | Value |
|---------|--------|
| Base / package directory | `apps/studio` |
| Build command | *(from `apps/studio/netlify.toml`)* `npm install && npm run build --workspace studio` |
| Publish directory | `apps/studio/dist` |

### Studio environment variables

- `SANITY_STUDIO_PROJECT_ID`
- `SANITY_STUDIO_DATASET`
