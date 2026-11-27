import comicVine from './comicVine';
import { CoverQuery, CoverSource } from './types';

export type { CoverQuery, CoverSource } from './types';

export const COVER_SOURCES: CoverSource[] = [comicVine];

/** "Batman #497 (1993)", for log lines */
const describe = ({ series, issue, year }: CoverQuery): string =>
  `${series}${issue ? ` #${issue}` : ''}${year ? ` (${year})` : ''}`;

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
      console.warn(`${source.name} cover lookup failed:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`🖼️ No cover found for ${describe(query)} on ${available.map(s => s.name).join(', ')}; it keeps the placeholder.`);
  return null;
};