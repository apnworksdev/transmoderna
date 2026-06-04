/**
 * Client cart for shop pages. Resolves live variant GIDs via /api/product-variants before add.
 */
function getShopRoot(): HTMLElement | null {
  return document.querySelector('[data-shop-root]');
}

function readConfig(root: HTMLElement) {
  return {
    domain: root.dataset.shopifyDomain ?? '',
    token: root.dataset.storefrontToken ?? '',
    marketCountry: root.dataset.marketCountry ?? '',
    handle: root.dataset.productHandle ?? ''
  };
}

const API_VERSION = '2024-01';
const CART_KEY = 'transmoderna_shopify_cart_id';

async function storefrontFetch(
  endpoint: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Shopify error');
  }
  return json.data;
}

async function resolveVariantGid(handle: string): Promise<string | undefined> {
  const res = await fetch(`/api/product-variants?handle=${encodeURIComponent(handle)}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.variants)) {
    return undefined;
  }
  const selected = document.querySelector<HTMLInputElement>('[data-variant-radio]:checked');
  const title = selected?.dataset.variantTitle;
  const match = json.variants.find(
    (v: { id: string; title: string }) => !title || v.title === title
  );
  return match?.id ?? json.variants[0]?.id;
}

function init() {
  const root = getShopRoot();
  if (!root) return;

  const { domain, token, marketCountry, handle } = readConfig(root);
  if (!domain || !token) return;

  const endpoint = `https://${domain}/api/${API_VERSION}/graphql.json`;
  const statusEl = root.querySelector('[data-cart-status]');
  const checkoutEl = root.querySelector<HTMLAnchorElement>('[data-cart-checkout]');

  async function getOrCreateCart() {
    const existing = localStorage.getItem(CART_KEY);
    if (existing) {
      try {
        const data = await storefrontFetch(
          endpoint,
          token,
          `query CartGet($id: ID!) { cart(id: $id) { id checkoutUrl totalQuantity } }`,
          { id: existing }
        );
        if (data?.cart?.id) return data.cart;
      } catch {
        localStorage.removeItem(CART_KEY);
      }
    }
    const data = await storefrontFetch(
      endpoint,
      token,
      `mutation { cartCreate { cart { id checkoutUrl } userErrors { message } } }`
    );
    const cart = data?.cartCreate?.cart;
    if (!cart?.id) throw new Error('Failed to create cart');
    localStorage.setItem(CART_KEY, cart.id);
    return cart;
  }

  document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!(btn instanceof HTMLButtonElement)) return;

      const productHandle =
        handle || btn.closest('[data-shop-root]')?.getAttribute('data-product-handle');
      if (!productHandle) return;

      const prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Adding…';

      try {
        const merchandiseId = await resolveVariantGid(productHandle);
        if (!merchandiseId) throw new Error('No variant');

        const cart = await getOrCreateCart();
        const data = await storefrontFetch(
          endpoint,
          token,
          `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart { id checkoutUrl totalQuantity }
              userErrors { message }
            }
          }`,
          { cartId: cart.id, lines: [{ merchandiseId, quantity: 1 }] }
        );
        const updated = data?.cartLinesAdd?.cart;
        if (statusEl) {
          statusEl.textContent = `Cart: ${updated?.totalQuantity ?? 1} item(s)`;
        }
        if (checkoutEl && updated?.checkoutUrl) {
          checkoutEl.href = updated.checkoutUrl;
          checkoutEl.hidden = false;
        }
        btn.textContent = 'Added';
      } catch (err) {
        console.error('[shop-cart]', err);
        btn.textContent = 'Error';
        if (statusEl) statusEl.textContent = 'Could not add to cart.';
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = prev ?? 'Add to cart';
        }, 1200);
      }
    });
  });

  document.querySelectorAll('[data-variant-radio]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const card = radio.closest('[data-product-buy]');
      const priceEl = card?.querySelector('[data-variant-price]');
      const input = radio as HTMLInputElement;
      const amount = input.dataset.price;
      if (priceEl && amount) {
        priceEl.textContent = amount;
      }
    });
  });

  void (async () => {
    try {
      const existing = localStorage.getItem(CART_KEY);
      if (!existing) return;
      const data = await storefrontFetch(
        endpoint,
        token,
        `query CartGet($id: ID!) { cart(id: $id) { checkoutUrl totalQuantity } }`,
        { id: existing }
      );
      const cart = data?.cart;
      if (statusEl && cart?.totalQuantity) {
        statusEl.textContent = `Cart: ${cart.totalQuantity} item(s)`;
      }
      if (checkoutEl && cart?.checkoutUrl) {
        checkoutEl.href = cart.checkoutUrl;
        checkoutEl.hidden = false;
      }
    } catch {
      /* ignore */
    }
  })();
}

init();
document.addEventListener('astro:page-load', init);
