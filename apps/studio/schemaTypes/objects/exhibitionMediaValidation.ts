import { isYouTubeUrl } from '@repo/shared';
import type { ValidationContext } from 'sanity';
import { isVimeoUrl } from './vimeoVideo';

type ExhibitionMediaValue = {
  kind?: string;
  image?: unknown;
  videoUrl?: string;
  youtubeUrl?: string;
};

export function validateExhibitionMedia(value: unknown): true | string {
  const media = value as ExhibitionMediaValue | undefined;
  if (!media) {
    return 'Add media content';
  }
  if (!media.kind) {
    return 'Choose image or video';
  }
  if (media.kind === 'image' && !media.image) {
    return 'Add an image';
  }
  if (media.kind === 'video') {
    const vimeo = media.videoUrl?.trim() ?? '';
    const youtube = media.youtubeUrl?.trim() ?? '';
    if (vimeo && youtube) {
      return 'Use either a Vimeo URL or a YouTube URL, not both';
    }
    if (!vimeo && !youtube) {
      return 'Add a Vimeo URL or a YouTube URL';
    }
    if (vimeo && !isVimeoUrl(vimeo)) {
      return 'Use a valid vimeo.com URL';
    }
    if (youtube && !isYouTubeUrl(youtube)) {
      return 'Use a valid YouTube URL';
    }
  }
  return true;
}

export function validateExhibitionText(value: unknown): true | string {
  const text = value as { title?: string; content?: string; footnote?: string } | undefined;
  if (!text) {
    return 'Add text content';
  }
  if (text.title?.trim() || text.content?.trim() || text.footnote?.trim()) {
    return true;
  }
  return 'Add a title, content, or footnote';
}

export function columnContentType(context: ValidationContext): string | undefined {
  return (context.parent as { contentType?: string } | undefined)?.contentType;
}
