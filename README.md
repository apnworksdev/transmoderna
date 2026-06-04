# Transmoderna

Astro + Sanity Studio + Shopify monorepo. See [docs/ARCHITECTURE_BLUEPRINT.md](docs/ARCHITECTURE_BLUEPRINT.md) for the full architecture.

## Quick start

```bash
npm install
```

### Sanity project (first time)

Follow [docs/sanity-setup.md](docs/sanity-setup.md): `sanity login`, then `sanity project create` from `apps/studio`.

### Development

```bash
npm run dev          # web :4321 + studio :3333
npm run dev:web
npm run dev:studio
```

### Build

```bash
npm run build:studio
npm run build:web
```

Use `npm run dev:web` for local testing — `astro preview` is not supported with the Netlify adapter.

## Structure

- `apps/web` — Astro 6 SSR (Netlify), Sanity reads, Shopify sync API
- `apps/studio` — Sanity Studio (empty schema; add types next)
- `packages/shared` — Document IDs, env schemas, Shopify document types
- `packages/shopify-sync` — Custom sync stub (501 until schemas + full handler)
- Shop: `/shop` listing + `/shop/[handle]` product pages — see [docs/shopify-setup.md](docs/shopify-setup.md)
