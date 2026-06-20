import { SHOP_DOCUMENT_ID } from '@repo/shared';
import { createClient } from '@sanity/client';
import type { PortableTextBlock } from '@portabletext/types';
import { sanityClient } from './sanity';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION ?? '2025-08-15';

/**
 * Sanity dataset is not readable without a token on the public API (returns 0 documents).
 * Set SANITY_API_READ_TOKEN (Viewer) in apps/web/.env and in production env (e.g. Netlify).
 */
function getShopSanityClient() {
  if (!projectId) {
    return null;
  }

  const readToken = import.meta.env.SANITY_API_READ_TOKEN?.trim();
  if (readToken) {
    return createClient({
      projectId,
      dataset,
      apiVersion,
      token: readToken,
      useCdn: false,
      perspective: 'published'
    });
  }

  if (!sanityClient) {
    return null;
  }

  return sanityClient.withConfig({ useCdn: false, apiVersion });
}

const productFields = `{
  _id,
  body,
  seo,
  store{
    title,
    slug,
    status,
    isDeleted,
    previewImageUrl,
    descriptionHtml,
    priceRange{minVariantPrice, maxVariantPrice},
    tags,
    options[]{ name, values },
    variants[]->{
      _id,
      "title": coalesce(store.title, store.option1),
      store{
        gid,
        title,
        option1,
        option2,
        option3,
        status,
        isDeleted,
        price,
        compareAtPrice,
        previewImageUrl,
        inventory{isAvailable, policy}
      }
    }
  }
}`;

export type ShopProduct = {
  _id: string;
  body?: PortableTextBlock[];
  seo?: { title?: string; description?: string };
  store?: {
    title?: string;
    slug?: { current?: string };
    status?: string;
    previewImageUrl?: string;
    descriptionHtml?: string;
    priceRange?: { minVariantPrice?: number; maxVariantPrice?: number };
    isDeleted?: boolean;
    tags?: string;
    options?: Array<{ name?: string; values?: string[] | null }> | null;
    variants?: Array<{
      _id: string;
      title?: string;
      store?: {
        gid?: string;
        title?: string;
        option1?: string;
        option2?: string;
        option3?: string;
        status?: string;
        isDeleted?: boolean;
        price?: number;
        compareAtPrice?: number;
        previewImageUrl?: string;
        inventory?: { isAvailable?: boolean; policy?: string } | null;
      };
    }> | null;
  };
};

export type ShopPageData = {
  intro?: PortableTextBlock[];
  products: ShopProduct[];
};

export type ShopVariant = NonNullable<NonNullable<ShopProduct['store']>['variants']>[number];

function filterProducts(products: ShopProduct[] | null | undefined): ShopProduct[] {
  return (products ?? []).filter((p) => {
    if (!p?.store || p.store.isDeleted) {
      return false;
    }
    const status = p.store.status;
    return !status || status === 'active';
  });
}

const SHOP_CACHE_TTL_MS = 60_000;

type ShopCacheEntry = {
  expiresAt: number;
  value: ShopPageData | null;
};

let shopPageCache: ShopCacheEntry | null = null;

export async function getAllShopProducts(): Promise<ShopProduct[]> {
  const page = await getShopPage();
  return page?.products ?? [];
}

export async function getShopPage(): Promise<ShopPageData | null> {
  const now = Date.now();
  if (shopPageCache && shopPageCache.expiresAt > now) {
    return shopPageCache.value;
  }

  const client = getShopSanityClient();
  if (!client) {
    shopPageCache = { expiresAt: now + SHOP_CACHE_TTL_MS, value: null };
    return null;
  }

  const doc = await client.fetch<{
    intro?: PortableTextBlock[];
    products?: ShopProduct[] | null;
  } | null>(
    `*[_id == $id][0]{
      intro,
      "products": products[]->${productFields}
    }`,
    { id: SHOP_DOCUMENT_ID }
  );

  let products = filterProducts(doc?.products);
  if (products.length === 0) {
    const allProducts = await client.fetch<ShopProduct[]>(
      `*[_type == "product" && coalesce(store.isDeleted, false) != true && coalesce(store.status, "active") == "active"] | order(store.title asc) ${productFields}`
    );
    products = filterProducts(allProducts);
  }

  const value: ShopPageData = {
    intro: doc?.intro,
    products
  };

  shopPageCache = { expiresAt: now + SHOP_CACHE_TTL_MS, value };
  return value;
}

export async function getShopProductByHandle(handle: string): Promise<ShopProduct | null> {
  const client = getShopSanityClient();
  if (!client || !handle.trim()) {
    return null;
  }

  const product = await client.fetch<ShopProduct | null>(
    `*[_type == "product" && store.slug.current == $handle && coalesce(store.isDeleted, false) != true && coalesce(store.status, "active") == "active"][0]${productFields}`,
    { handle: handle.trim() }
  );

  return product?.store ? product : null;
}

export function productHandle(product: ShopProduct): string | undefined {
  const handle = product.store?.slug?.current;
  return typeof handle === 'string' && handle.trim() ? handle.trim() : undefined;
}

export function productImageUrl(product: ShopProduct): string | undefined {
  const preview = product.store?.previewImageUrl;
  if (typeof preview === 'string' && preview.trim()) {
    return preview.trim();
  }
  const variantPreview = product.store?.variants?.find((v) => v.store?.previewImageUrl)?.store
    ?.previewImageUrl;
  return typeof variantPreview === 'string' && variantPreview.trim()
    ? variantPreview.trim()
    : undefined;
}

export function productDisplayPrice(product: ShopProduct): number | undefined {
  const fromRange = product.store?.priceRange?.minVariantPrice;
  if (typeof fromRange === 'number' && fromRange > 0) {
    return fromRange;
  }
  const variant = product.store?.variants?.find(
    (v) => typeof v.store?.price === 'number' && v.store.price > 0
  );
  return variant?.store?.price;
}

export function variantTitle(variant: ShopVariant): string {
  const t = variant.title ?? variant.store?.title ?? variant.store?.option1;
  return typeof t === 'string' && t.trim() ? t.trim() : 'Variant';
}

export function variantAvailable(variant: ShopVariant): boolean {
  if (variant.store?.isDeleted) {
    return false;
  }
  const status = variant.store?.status;
  if (status && status !== 'active') {
    return false;
  }
  return variant.store?.inventory?.isAvailable !== false;
}

/** Lowercase text used for client-side shop search matching. */
export function productSearchText(product: ShopProduct): string {
  const parts: string[] = [];
  const title = product.store?.title?.trim();
  if (title) parts.push(title);

  const tags = product.store?.tags?.trim();
  if (tags) parts.push(tags);

  for (const variant of product.store?.variants ?? []) {
    parts.push(variantTitle(variant));
    for (const option of [
      variant.store?.option1,
      variant.store?.option2,
      variant.store?.option3,
      variant.store?.title
    ]) {
      if (typeof option === 'string' && option.trim()) {
        parts.push(option.trim());
      }
    }
  }

  return parts.join(' ').toLowerCase();
}
