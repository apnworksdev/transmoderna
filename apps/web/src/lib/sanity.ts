import {
  ABOUT_DOCUMENT_ID,
  HOME_DOCUMENT_ID,
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

export type ExhibitionDocument = {
  _id: string;
  title?: string;
  thumbnailImage?: SanityImageWithAlt;
  tags?: string[];
  location?: string;
  year?: number;
  artists?: ArtistDocument[];
  sortOrder?: number;
};

export type PortfolioItemDocument = {
  _id: string;
  title?: string;
  media?: {
    kind?: 'image' | 'vimeo';
    image?: SanityImageWithAlt;
    vimeo?: VimeoVideo;
  };
  sortOrder?: number;
};

export type PodcastDocument = {
  _id: string;
  title?: string;
  podcaster?: string;
  number?: number;
  url?: string;
  sortOrder?: number;
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
    body?: PortableTextBlock[];
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

export async function getExhibitions(): Promise<ExhibitionDocument[]> {
  if (!client) {
    return [];
  }
  return client.fetch<ExhibitionDocument[]>(
    `*[_type == "exhibition"] | order(sortOrder asc, year desc){
      _id,
      title,
      thumbnailImage { ..., alt },
      tags,
      location,
      year,
      "artists": artists[]->{ _id, name, country },
      sortOrder
    }`
  );
}

export async function getPortfolioItems(): Promise<PortfolioItemDocument[]> {
  if (!client) {
    return [];
  }
  return client.fetch<PortfolioItemDocument[]>(
    `*[_type == "portfolioItem"] | order(sortOrder asc){
      _id,
      title,
      media {
        kind,
        image { ..., alt },
        vimeo
      },
      sortOrder
    }`
  );
}

export async function getPodcasts(): Promise<PodcastDocument[]> {
  if (!client) {
    return [];
  }
  return client.fetch<PodcastDocument[]>(
    `*[_type == "podcast"] | order(sortOrder asc, number desc){
      _id,
      title,
      podcaster,
      number,
      url,
      sortOrder
    }`
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
        image { ..., alt }
      },
      contact,
      connect
    }`,
    { id: ABOUT_DOCUMENT_ID }
  );
}
