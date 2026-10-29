# Transmoderna

Astro 7 site, Sanity Studio, and Shopify, in one npm workspace. The live site is [www.transmoderna.net](https://www.transmoderna.net). Studio is a separate deploy.

Start here. [docs/ARCHITECTURE_BLUEPRINT.md](docs/ARCHITECTURE_BLUEPRINT.md) is the original scaffold spec and is partly out of date.

## Requirements

- Node.js **22.12** or newer (`engines` in the root `package.json`)
- npm (this repo uses `package-lock.json`; do not switch to pnpm or yarn)

## Access before you clone

Use the existing project. Do not create a new Sanity project or Shopify store.

| Service | What you need |
|---------|----------------|
| GitHub | Read access to [apnworksdev/transmoderna](https://github.com/apnworksdev/transmoderna) |
| Sanity | Membership on the existing Sanity project. [manage.sanity.io](https://www.sanity.io/manage) |
| Shopify | Access to the existing Shopify store only if you work on the shop or cart |
| Netlify | Access to the web and studio sites only if you deploy. See [docs/netlify-setup.md](docs/netlify-setup.md) |

## Environment files

Secrets stay out of git. Copy the examples and fill in the values you receive separately:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/studio/.env.example apps/studio/.env
```

`apps/web/.env.example` and `apps/studio/.env.example` are the variable lists. Studio login is `npx sanity login` inside `apps/studio`. The dataset is private, so local pages stay empty until `SANITY_API_READ_TOKEN` is set.

## Install and run

From the repo root:

```bash
npm install
npm run dev          # web http://localhost:4321 and studio http://localhost:3333
npm run dev:web
npm run dev:studio
```

```bash
npm run build:studio
npm run build:web
```

Use `npm run dev:web` for local testing. `astro preview` is not supported with the Netlify adapter.

## What is in the repo

- `apps/web` — Astro 7 SSR (`@astrojs/netlify`). Reads Sanity, shop pages, cart.
- `apps/studio` — Sanity Studio. Schema is in place (home, about, shop, work, exhibitions, portfolio, podcasts, products).
- `packages/shared` — document ids, nav, env schemas, Shopify id helpers.
- `packages/shopify-sync` — custom sync entry point. `POST /api/shopify-sync` still returns **501** after the shared secret check. Product documents today come from Sanity Connect’s normal sync, not this handler.
- `apps/studio/scripts` — one-off seeds and migrations. Do not re-run them unless you mean to change live content. They use `sanity exec … --with-user-token` after `sanity login`.

## Routes

| URL | Page |
|-----|------|
| `/` | Home (video links into the shop) |
| `/shop` | Product grid (only products on the Shop singleton) |
| `/shop/[handle]` | Product detail and add to cart |
| `/shop/cart` | Cart |
| `/work`, `/exhibitions`, `/portfolio`, `/podcasts`, `/about` | Built, but **redirected to `/`** |

`apps/web/src/middleware.ts` sends Work, Exhibitions, Portfolio, Podcasts, and About back to the home page (shop-only launch). Delete that middleware when those sections should be public. The pages themselves are already there.

## Docs

- [docs/sanity-setup.md](docs/sanity-setup.md) — join the existing project, or create one only if you are starting over
- [docs/shopify-setup.md](docs/shopify-setup.md) — Connect, shop singleton, cart
- [docs/netlify-setup.md](docs/netlify-setup.md) — two Netlify sites, env vars, shop subdomain redirect
