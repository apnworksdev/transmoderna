# Shopify + Sanity shop setup

## Architecture

| Layer | Role |
|-------|------|
| **Sanity Connect** | Syncs products, variants, collections from Shopify into Sanity |
| **Sanity `product` docs** | Editorial description (`body`) + read-only `store` object |
| **`/shop`** | Product grid (only products listed on the Shop singleton) |
| **`/shop/[handle]`** | Product detail + add to cart |
| **Storefront API** | Live variant GIDs via `/api/product-variants` before checkout |

## 1. Shopify apps

Create a custom app in Shopify Admin with:

- **Admin API** — for custom sync (later) and Sanity Connect
- **Storefront API** — public token for cart/checkout

Put the Storefront values in `apps/web/.env`. The key names are already in `apps/web/.env.example`. `SANITY_API_WRITE_TOKEN` can stay empty until custom sync is implemented.

## 2. Sanity Connect

1. Install [Sanity Connect](https://www.sanity.io/plugins/sanity-connect) on your Shopify store.
2. Link the existing Sanity project and dataset.
3. Run **Sync all** so `product` / `productVariant` documents appear.
4. Leave **Custom sync URL** unset for now. `POST /api/shopify-sync` checks `SHOPIFY_SYNC_SECRET`, then returns **501**. Product schemas exist; the handler in `packages/shopify-sync` does not write to Sanity yet. When it does, the URL is `https://<your-domain>/api/shopify-sync`.

## 3. Studio

1. Open **Shop** singleton — add the products that should appear on the site (order is the grid order). Only those products are shown and loaded.
2. Edit each **Product** — add portable text `body`; do not edit `store.*` (synced).
3. Create **Home** / content as needed.

## 4. Verify locally

```bash
npm run dev
```

- http://localhost:4321/shop — lists synced products
- http://localhost:4321/shop/your-product-handle — detail + add to cart (needs Storefront token)

## Routes

- `/shop` — listing
- `/shop/[handle]` — PDP (`store.slug.current` from Shopify)
