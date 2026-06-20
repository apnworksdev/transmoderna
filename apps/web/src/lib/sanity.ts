import {
  ABOUT_DOCUMENT_ID,
  EXHIBITIONS_PAGE_DOCUMENT_ID,
  HOME_DOCUMENT_ID,
  PODCAST_PAGE_DOCUMENT_ID,
  PORTFOLIO_PAGE_DOCUMENT_ID,
  SITE_HEADER_DOCUMENT_ID,
  WORK_PAGE_DOCUMENT_ID
} from '@repo/shared';
import { createClient } from '@sanity/client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import type { PortableTextBlock } from '@portabletext/types';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION ?? '2025-08-15';

const imageBuilder =
  projectId && dataset ? createImageUrlBuilder({ projectId, dataset }) : null;

export type SanityImageWithAlt = SanityImageSource & {
  alt?: string;
  asset?: {
    url?: string;
    mimeType?: string;
  };
};

export type VimeoVideo = {
  url?: string;
  title?: string;
  description?: PortableTextBlock[];
};

export type WorkMedia = {
  url?: string;
  videoSrc?: string;
  image?: SanityImageWithAlt;
  footnote?: string;
};

export type SiteMenuLink = {
  label: string;
  href: string;
  image?: SanityImageWithAlt | null;
};

export type SiteHeaderDocument = {
  logo?: SanityImageWithAlt;
  menuLinks?: SiteMenuLink[];
};

export type HomeDocument = {
  introText?: string;
  logo?: SanityImageWithAlt;
};

export type WorkDocument = {
  _id: string;
  title?: string;
  year?: number;
  description?: string;
  media?: WorkMedia[];
  sortOrder?: number;
};

export type WorkPageClient = {
  name?: string;
};

export type WorkPageDocument = {
  backgroundImage?: SanityImageWithAlt;
  clients?: WorkPageClient[];
  works?: WorkDocument[];
};

export type ArtistDocument = {
  _id: string;
  name?: string;
  country?: string;
};

export type ExhibitionMedia = {
  kind?: 'image' | 'video';
  image?: SanityImageWithAlt;
  videoUrl?: string;
  videoSrc?: string;
};

export type ExhibitionText = {
  title?: string;
  content?: string;
  footnote?: string;
};

export type ExhibitionColumn = {
  contentType?: 'empty' | 'media' | 'text';
  media?: ExhibitionMedia;
  text?: ExhibitionText;
};

export type ExhibitionContentBlock =
  | {
      _type: 'exhibitionFullImageBlock';
      _key: string;
      media?: ExhibitionMedia;
    }
  | {
      _type: 'exhibitionTwoColumnBlock';
      _key: string;
      left?: ExhibitionColumn;
      right?: ExhibitionColumn;
    };

export type ExhibitionDocument = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  thumbnailImage?: SanityImageWithAlt;
  fullImage?: SanityImageWithAlt;
  tags?: string[];
  location?: string;
  year?: number;
  artists?: ArtistDocument[];
  content?: ExhibitionContentBlock[];
};

export type ExhibitionsPageDocument = {
  thumbnailBackgroundImage?: SanityImageWithAlt;
  fullBackgroundImage?: SanityImageWithAlt;
  singleBackgroundImage?: SanityImageWithAlt;
  exhibitions?: ExhibitionDocument[];
};

export type PortfolioItemDocument = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  subtitle?: string;
  year?: number;
  thumbnailImage?: SanityImageWithAlt;
  videoUrl?: string;
  videoSrc?: string;
  sortOrder?: number;
};

export type PortfolioPageDocument = {
  backgroundImage?: SanityImageWithAlt;
  portfolioItems?: PortfolioItemDocument[];
};

export type PodcastDocument = {
  _id: string;
  title?: string;
  podcaster?: string;
  number?: number;
  slug?: { current?: string };
  publishDate?: string;
  audioFileUrl?: string;
  playerBackgroundImage?: SanityImageWithAlt;
  sortOrder?: number;
};

export type PodcastPageDocument = {
  backgroundImage?: SanityImageWithAlt;
  podcasts?: PodcastDocument[];
};

export type TeamMember = {
  name?: string;
  description?: PortableTextBlock[];
  image?: SanityImageWithAlt;
};

export type ConnectLink = {
  label?: string;
  url?: string;
};

export type AboutDocument = {
  description?: PortableTextBlock[];
  teamMembers?: TeamMember[];
  contact?: {
    heading?: string;
    links?: ConnectLink[];
  };
  connect?: {
    heading?: string;
    links?: ConnectLink[];
  };
};

export function urlForSanityImage(
  source: SanityImageSource | null | undefined,
  options: { width: number; height?: number; quality?: number } = { width: 800 }
): string | undefined {
  if (!imageBuilder || source == null) {
    return undefined;
  }

  const asset =
    source && typeof source === 'object' && 'asset' in source
      ? (source as SanityImageWithAlt).asset
      : undefined;

  if (asset?.mimeType === 'image/svg+xml' && asset.url) {
    return asset.url;
  }

  try {
    let chain = imageBuilder
      .image(source)
      .auto('format')
      .width(options.width)
      .quality(options.quality ?? 82);
    if (options.height != null) {
      chain = chain.height(options.height);
    }
    return chain.url();
  } catch {
    return undefined;
  }
}

export function imageAlt(
  image: SanityImageWithAlt | null | undefined,
  fallback: string
): string {
  const alt = image && typeof image === 'object' && 'alt' in image ? image.alt : undefined;
  return typeof alt === 'string' && alt.trim() ? alt.trim() : fallback;
}

export { resolveVimeoVideoSrc, vimeoEmbedUrl } from './vimeo';

const readToken = import.meta.env.SANITY_API_READ_TOKEN?.trim();

const client = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      token: readToken || undefined,
      useCdn: !readToken,
      perspective: readToken ? 'published' : undefined
    })
  : null;

export const sanityClient = client;

export async function getHome(): Promise<HomeDocument | null> {
  if (!client) {
    return null;
  }
  return client.fetch<HomeDocument | null>(
    `*[_type == "home" && _id == $id][0]{
      introText,
      logo { ..., alt, asset->{ url, mimeType } }
    }`,
    { id: HOME_DOCUMENT_ID }
  );
}

const siteHeaderImageProjection = `{
  ...,
  alt,
  asset->{ url, mimeType }
}`;

export async function getSiteHeader(): Promise<SiteHeaderDocument | null> {
  if (!client) {
    return null;
  }
  return client.fetch<SiteHeaderDocument | null>(
    `*[_type == "siteHeader" && _id == $id][0]{
      logo ${siteHeaderImageProjection},
      menuLinks[]{
        label,
        href,
        image ${siteHeaderImageProjection}
      }
    }`,
    { id: SITE_HEADER_DOCUMENT_ID }
  );
}

const workDocumentProjection = `{
  _id,
  title,
  year,
  description,
  media[]{
    url,
    footnote,
    image { ..., alt, asset->{ url, mimeType } }
  },
  sortOrder
}`;

async function enrichWorks(works: WorkDocument[]): Promise<WorkDocument[]> {
  const { resolveVimeoVideoSrc } = await import('./vimeo');
  const { normalizePlainText } = await import('./portableText');

  return Promise.all(
    works.map(async (work) => {
      const description = normalizePlainText(work.description) || undefined;

      if (!work.media?.length) {
        return { ...work, description };
      }

      const media = await Promise.all(
        work.media.map(async (entry) => {
          const url = entry.url?.trim();
          if (!url) {
            return entry;
          }
          const videoSrc = await resolveVimeoVideoSrc(url);
          return videoSrc ? { ...entry, videoSrc } : entry;
        })
      );

      return { ...work, description, media };
    })
  );
}

export async function getWorks(): Promise<WorkDocument[]> {
  if (!client) {
    return [];
  }
  const works = await client.fetch<WorkDocument[]>(
    `*[_type == "work"] | order(sortOrder asc, year desc) ${workDocumentProjection}`
  );

  return enrichWorks(works);
}

export async function getWorkPage(): Promise<WorkPageDocument | null> {
  if (!client) {
    return null;
  }

  const page = await client.fetch<WorkPageDocument | null>(
    `*[_type == "workPage" && _id == $id][0]{
      backgroundImage { ..., alt, asset->{ url, mimeType } },
      clients[]{ name },
      "works": workItems[]->${workDocumentProjection}
    }`,
    { id: WORK_PAGE_DOCUMENT_ID }
  );

  if (!page) {
    return null;
  }

  const works = (page.works ?? []).filter((work): work is WorkDocument => Boolean(work?._id));
  return {
    ...page,
    works: await enrichWorks(works)
  };
}

const exhibitionMediaProjection = `{
  kind,
  videoUrl,
  image { ..., alt, asset->{ url, mimeType } }
}`;

const exhibitionListProjection = `{
  _id,
  title,
  slug,
  thumbnailImage { ..., alt, asset->{ url, mimeType } },
  fullImage { ..., alt, asset->{ url, mimeType } },
  tags,
  location,
  year,
  "artists": artists[]->{ _id, name, country }
}`;

const exhibitionContentProjection = `content[]{
  _type,
  _key,
  _type == "exhibitionFullImageBlock" => {
    media ${exhibitionMediaProjection}
  },
  _type == "exhibitionTwoColumnBlock" => {
    left {
      contentType,
      media ${exhibitionMediaProjection},
      text { title, content, footnote }
    },
    right {
      contentType,
      media ${exhibitionMediaProjection},
      text { title, content, footnote }
    }
  }
}`;

async function enrichExhibitionMedia(media: ExhibitionMedia | undefined): Promise<ExhibitionMedia | undefined> {
  if (!media?.kind || media.kind !== 'video' || !media.videoUrl?.trim()) {
    return media;
  }

  const { resolveVimeoVideoSrc } = await import('./vimeo');
  const videoSrc = await resolveVimeoVideoSrc(media.videoUrl);
  return videoSrc ? { ...media, videoSrc } : media;
}

async function enrichExhibitionColumn(
  column: ExhibitionColumn | undefined
): Promise<ExhibitionColumn | undefined> {
  if (!column || column.contentType !== 'media' || !column.media) {
    return column;
  }

  return {
    ...column,
    media: await enrichExhibitionMedia(column.media)
  };
}

async function enrichExhibitionContent(
  content: ExhibitionContentBlock[] | undefined
): Promise<ExhibitionContentBlock[] | undefined> {
  if (!content?.length) {
    return content;
  }

  return Promise.all(
    content.map(async (block) => {
      if (block._type === 'exhibitionFullImageBlock') {
        return {
          ...block,
          media: await enrichExhibitionMedia(block.media)
        };
      }

      if (block._type !== 'exhibitionTwoColumnBlock') {
        return block;
      }

      const [left, right] = await Promise.all([
        enrichExhibitionColumn(block.left),
        enrichExhibitionColumn(block.right)
      ]);

      return { ...block, left, right };
    })
  );
}

async function enrichExhibition(exhibition: ExhibitionDocument): Promise<ExhibitionDocument> {
  return {
    ...exhibition,
    content: await enrichExhibitionContent(exhibition.content)
  };
}

export async function getExhibitionsPage(): Promise<ExhibitionsPageDocument | null> {
  if (!client) {
    return null;
  }

  const page = await client.fetch<ExhibitionsPageDocument | null>(
    `*[_type == "exhibitionsPage" && _id == $id][0]{
      thumbnailBackgroundImage { ..., alt, asset->{ url, mimeType } },
      fullBackgroundImage { ..., alt, asset->{ url, mimeType } },
      singleBackgroundImage { ..., alt, asset->{ url, mimeType } },
      "exhibitions": exhibitions[]->${exhibitionListProjection}
    }`,
    { id: EXHIBITIONS_PAGE_DOCUMENT_ID }
  );

  if (!page) {
    return null;
  }

  let exhibitions = (page.exhibitions ?? []).filter((item): item is ExhibitionDocument =>
    Boolean(item?._id)
  );

  if (exhibitions.length === 0) {
    exhibitions = await client.fetch<ExhibitionDocument[]>(
      `*[_type == "exhibition"] | order(title asc) ${exhibitionListProjection}`
    );
  }

  return {
    thumbnailBackgroundImage: page.thumbnailBackgroundImage,
    fullBackgroundImage: page.fullBackgroundImage,
    singleBackgroundImage: page.singleBackgroundImage,
    exhibitions
  };
}

export async function getExhibitionsSingleBackgroundImage(): Promise<SanityImageWithAlt | null> {
  if (!client) {
    return null;
  }

  return client.fetch<SanityImageWithAlt | null>(
    `*[_type == "exhibitionsPage" && _id == $id][0].singleBackgroundImage {
      ...,
      alt,
      asset->{ url, mimeType }
    }`,
    { id: EXHIBITIONS_PAGE_DOCUMENT_ID }
  );
}

export async function getExhibitionBySlug(slug: string): Promise<ExhibitionDocument | null> {
  if (!client) {
    return null;
  }

  const exhibition = await client.fetch<ExhibitionDocument | null>(
    `*[_type == "exhibition" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      thumbnailImage { ..., alt, asset->{ url, mimeType } },
      tags,
      location,
      year,
      "artists": artists[]->{ _id, name, country },
      ${exhibitionContentProjection}
    }`,
    { slug }
  );

  if (!exhibition) {
    return null;
  }

  return enrichExhibition(exhibition);
}

const portfolioItemProjection = `{
  _id,
  title,
  slug,
  subtitle,
  year,
  thumbnailImage { ..., alt, asset->{ url, mimeType } },
  videoUrl,
  sortOrder
}`;

async function enrichPortfolioItems(
  items: PortfolioItemDocument[]
): Promise<PortfolioItemDocument[]> {
  const { resolveVimeoVideoSrc } = await import('./vimeo');

  return Promise.all(
    items.map(async (item) => {
      const videoUrl = item.videoUrl?.trim();
      if (!videoUrl) {
        return item;
      }

      const videoSrc = await resolveVimeoVideoSrc(videoUrl);
      return videoSrc ? { ...item, videoSrc } : item;
    })
  );
}

export async function getPortfolioPage(): Promise<PortfolioPageDocument | null> {
  if (!client) {
    return null;
  }

  const page = await client.fetch<PortfolioPageDocument | null>(
    `*[_type == "portfolioPage" && _id == $id][0]{
      backgroundImage { ..., alt, asset->{ url, mimeType } },
      "portfolioItems": portfolioItems[]->${portfolioItemProjection}
    }`,
    { id: PORTFOLIO_PAGE_DOCUMENT_ID }
  );

  if (!page) {
    return null;
  }

  let portfolioItems = (page.portfolioItems ?? []).filter((item): item is PortfolioItemDocument =>
    Boolean(item?._id)
  );

  if (portfolioItems.length === 0) {
    portfolioItems = await client.fetch<PortfolioItemDocument[]>(
      `*[_type == "portfolioItem"] | order(sortOrder asc) ${portfolioItemProjection}`
    );
  }

  return {
    backgroundImage: page.backgroundImage,
    portfolioItems: await enrichPortfolioItems(portfolioItems)
  };
}

export async function getPortfolioItemBySlug(slug: string): Promise<PortfolioItemDocument | null> {
  if (!client) {
    return null;
  }

  const item = await client.fetch<PortfolioItemDocument | null>(
    `*[_type == "portfolioItem" && slug.current == $slug][0] ${portfolioItemProjection}`,
    { slug }
  );

  if (!item) {
    return null;
  }

  const [enriched] = await enrichPortfolioItems([item]);
  return enriched ?? null;
}

export async function getPortfolioItems(): Promise<PortfolioItemDocument[]> {
  const page = await getPortfolioPage();
  return page?.portfolioItems ?? [];
}

export async function getPodcasts(): Promise<PodcastDocument[]> {
  const page = await getPodcastsPage();
  return page?.podcasts ?? [];
}

const podcastDocumentProjection = `{
  _id,
  title,
  podcaster,
  number,
  slug,
  publishDate,
  sortOrder,
  "audioFileUrl": audioFile.asset->url,
  playerBackgroundImage { ..., alt, asset->{ url, mimeType } }
}`;

export function formatPodcastNumber(number: number | null | undefined): string {
  if (number == null || !Number.isFinite(number)) {
    return '000';
  }

  return String(Math.max(0, Math.floor(number))).padStart(3, '0');
}

export function formatPodcastDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) {
    return isoDate;
  }

  return `${day}.${month}.${year}`;
}

export function formatElapsedTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00:00';
  }

  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export async function getPodcastsPage(): Promise<PodcastPageDocument | null> {
  if (!client) {
    return null;
  }

  const page = await client.fetch<PodcastPageDocument | null>(
    `*[_type == "podcastPage" && _id == $id][0]{
      backgroundImage { ..., alt, asset->{ url, mimeType } },
      "podcasts": podcasts[]->${podcastDocumentProjection}
    }`,
    { id: PODCAST_PAGE_DOCUMENT_ID }
  );

  if (!page) {
    return null;
  }

  let podcasts = (page.podcasts ?? []).filter((podcast): podcast is PodcastDocument =>
    Boolean(podcast?._id)
  );

  if (podcasts.length === 0) {
    podcasts = await client.fetch<PodcastDocument[]>(
      `*[_type == "podcast"] | order(sortOrder asc, number desc) ${podcastDocumentProjection}`
    );
  }

  return {
    backgroundImage: page.backgroundImage,
    podcasts
  };
}

export async function getPodcastBySlug(slug: string): Promise<PodcastDocument | null> {
  if (!client) {
    return null;
  }

  return client.fetch<PodcastDocument | null>(
    `*[_type == "podcast" && slug.current == $slug][0] ${podcastDocumentProjection}`,
    { slug }
  );
}

export async function getAbout(): Promise<AboutDocument | null> {
  if (!client) {
    return null;
  }
  return client.fetch<AboutDocument | null>(
    `*[_type == "about" && _id == $id][0]{
      description,
      teamMembers[]{
        name,
        description,
        image { ..., alt, asset->{ url, mimeType } }
      },
      contact,
      connect
    }`,
    { id: ABOUT_DOCUMENT_ID }
  );
}
