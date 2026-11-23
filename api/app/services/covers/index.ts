import comicVine from './comicVine';
import { CoverQuery, CoverSource } from './types';

export type { CoverQuery, CoverSource } from './types';

/**
 * Where Hero-Log looks for covers, in order: the first source with a match
 * wins. To add one, write a CoverSource (see ./comicVine.ts) and list it here.
 */
export const COVER_SOURCES: CoverSource[] = [comicVine];

/** "Batman #497 (1993)", for log lines */
const describe = ({ series, issue, year }: CoverQuery): string =>
  `${series}${issue ? ` #${issue}` : ''}${year ? ` (${year})` : ''}`;

/**
 * A comic's cover from the first source that finds one, or null. Sources that
 * aren't set up (no API key) are skipped; a failing source never stops the
 * others from being tried. Every lookup leaves one line in the logs saying
 * how it went, so a missing cover can always be explained.
 */
export const findCover = async (
  query: CoverQuery,
  sources: CoverSource[] = COVER_SOURCES
): Promise<string | null> => {
  const available = sources.filter(source => source.isAvailable());
  if (available.length === 0) {
    console.warn(
      `🖼️ No cover lookup for ${describe(query)}: no cover source is set up (add COMIC_VINE_API_KEY to the config vars).`
    );
    return null;
  }

  for (const source of available) {
    try {
      const cover = await source.find(query);
      if (cover) {
        console.log(`🖼️ Cover found for ${describe(query)} on ${source.name}.`);
        return cover;
      }
    } catch (error) {
      console.warn(`${source.name} cover lookup failed:`, (error as Error).message);
    }
  }

  console.log(`🖼️ No cover found for ${describe(query)} on ${available.map(s => s.name).join(', ')}; it keeps the placeholder.`);
  return null;
};