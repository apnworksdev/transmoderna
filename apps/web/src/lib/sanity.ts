import { ABOUT_DOCUMENT_ID, HOME_DOCUMENT_ID } from '@repo/shared';
import { createClient } from '@sanity/client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import type { PortableTextBlock } from '@portabletext/types';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION ?? '2025-08-15';

const imageBuilder =
  projectId && dataset ? createImageUrlBuilder({ projectId, dataset }) : null;

export type SanityImageWithAlt = SanityImageSource & { alt?: string };

export type VimeoVideo = {
  url?: string;
  title?: string;
  description?: PortableTextBlock[];
};

export type HomeDocument = {
  intro?: PortableTextBlock[];
  logo?: SanityImageWithAlt;
};

export type WorkDocument = {
  _id: string;
  title?: string;
  year?: number;
  description?: PortableTextBlock[];
  video?: VimeoVideo;
  sortOrder?: number;
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

export function vimeoEmbedUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) {
    return undefined;
  }
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    let id: string | undefined;

    if (host === 'player.vimeo.com') {
      const match = parsed.pathname.match(/\/video\/(\d+)/);
      id = match?.[1];
    } else if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      id = segments.find((s) => /^\d+$/.test(s)) ?? segments.at(-1);
      if (id && !/^\d+$/.test(id)) {
        id = undefined;
      }
    }

    return id ? `https://player.vimeo.com/video/${id}` : undefined;
  } catch {
    return undefined;
  }
}

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
      intro,
      logo { ..., alt }
    }`,
    { id: HOME_DOCUMENT_ID }
  );
}

export async function getWorks(): Promise<WorkDocument[]> {
  if (!client) {
    return [];
  }
  return client.fetch<WorkDocument[]>(
    `*[_type == "work"] | order(sortOrder asc, year desc){
      _id,
      title,
      year,
      description,
      video,
      sortOrder
    }`
  );
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
