import type { SchemaTypeDefinition } from 'sanity';
import { aboutType } from './documents/about';
import { artistType } from './documents/artist';
import { brandType } from './documents/brand';
import { exhibitionType } from './documents/exhibition';
import { homeType } from './documents/home';
import { podcastType } from './documents/podcast';
import { portfolioItemType } from './documents/portfolioItem';
import { productType } from './documents/product';
import { productVariantType } from './documents/productVariant';
import { shopType } from './documents/shop';
import { tagType } from './documents/tag';
import { workType } from './documents/work';
import { connectLinkType } from './objects/connectLink';
import { connectSectionType } from './objects/connectSection';
import { contactSectionType } from './objects/contactSection';
import { portfolioMediaType } from './objects/portfolioMedia';
import { teamMemberType } from './objects/teamMember';
import { vimeoVideoType } from './objects/vimeoVideo';
import { inventoryType } from './shopify/inventory';
import { optionType } from './shopify/option';
import { priceRangeType } from './shopify/priceRange';
import { shopifyProductType } from './shopify/shopifyProduct';
import { shopifyProductVariantType } from './shopify/shopifyProductVariant';
import { shopifyShopType } from './shopify/shopifyShop';

export const schemaTypes: SchemaTypeDefinition[] = [
  vimeoVideoType,
  portfolioMediaType,
  teamMemberType,
  contactSectionType,
  connectLinkType,
  connectSectionType,
  homeType,
  aboutType,
  shopType,
  workType,
  exhibitionType,
  artistType,
  portfolioItemType,
  podcastType,
  brandType,
  tagType,
  optionType,
  priceRangeType,
  inventoryType,
  shopifyShopType,
  shopifyProductVariantType,
  shopifyProductType,
  productVariantType,
  productType
];
