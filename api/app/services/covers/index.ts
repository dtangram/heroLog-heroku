import comicVine from './comicVine';
import { CoverQuery, CoverSource } from './types';

export type { CoverQuery, CoverSource } from './types';

/**
 * Where Hero-Log looks for covers, in order: the first source with a match
 * wins. To add one, write a CoverSource (see ./comicVine.ts) and list it here.
 */
export const COVER_SOURCES: CoverSource[] = [comicVine];

/**
 * A comic's cover from the first source that finds one, or null. Sources that
 * aren't set up (no API key) are skipped; a failing source never stops the
 * others from being tried.
 */
export const findCover = async (
  query: CoverQuery,
  sources: CoverSource[] = COVER_SOURCES
): Promise<string | null> => {
  for (const source of sources) {
    if (!source.isAvailable()) continue;
    try {
      const cover = await source.find(query);
      if (cover) return cover;
    } catch (error) {
      console.warn(`${source.name} cover lookup failed:`, (error as Error).message);
    }
  }
  return null;
};