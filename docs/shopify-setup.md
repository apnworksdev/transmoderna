# Shopify + Sanity shop setup

## Architecture

| Layer | Role |
|-------|------|
| **Sanity Connect** | Syncs products, variants, collections from Shopify into Sanity |
| **Sanity `product` docs** | Editorial description (`body`) + read-only `store` object |
| **`/shop`** | Product grid (curated in Shop singleton, or all products) |
| **`/shop/[handle]`** | Product detail + add to cart |
| **Storefront API** | Live variant GIDs via `/api/product-variants` before checkout |

## 1. Shopify apps

Create a custom app in Shopify Admin with:

- **Admin API** — for custom sync (later) and Sanity Connect
- **Storefront API** — public token for cart/checkout

Add to `apps/web/.env`:

```env
PUBLIC_SHOPIFY_DOMAIN=your-store.myshopify.com
PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=
PUBLIC_SHOPIFY_MARKET_COUNTRY=   # optional, e.g. ES

SANITY_STUDIO_SHOPIFY_DOMAIN=your-store.myshopify.com
SANITY_STUDIO_SHOPIFY_ADMIN_ACCESS_TOKEN=
SANITY_API_WRITE_TOKEN=          # for custom sync webhook
```

## 2. Sanity Connect

1. Install [Sanity Connect](https://www.sanity.io/plugins/sanity-connect) on your Shopify store.
2. Link project `6fitszr8` (or yours) and dataset `production`.
3. Run **Sync all** so `product` / `productVariant` documents appear.
4. Set **Custom sync URL** (when full sync is implemented):  
   `https://<your-domain>/api/shopify-sync`

## 3. Studio

1. Open **Shop** singleton — add intro copy and optional featured product order.
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
