export const EXHIBITIONS_VIEW_STORAGE_KEY = 'exhibitions-view-mode';

export type ExhibitionsViewMode = 'thumbnail' | 'full';

export function getDefaultExhibitionsViewMode(): ExhibitionsViewMode {
  return 'full';
}
