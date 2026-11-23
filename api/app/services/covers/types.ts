/** What a cover source is asked to find */
export interface CoverQuery {
  /** The series, e.g. "Batman" */
  series: string;
  /** The issue number, e.g. 497 */
  issue: number | string | null | undefined;
  /** The year it came out, if known; picks the right series when several share a name */
  year?: number | string | null;
}

/**
 * Somewhere Hero-Log can look up covers. To add a source, write one of these
 * and add it to COVER_SOURCES in ./index.ts. Pages that show its covers must
 * credit it: add it to COVER_SOURCES in the React app's coverCredit too.
 */
export interface CoverSource {
  /** Shown in logs, e.g. "Comic Vine" */
  name: string;
  /** False when the source can't be used, e.g. its API key isn't set */
  isAvailable: () => boolean;
  /** The cover's URL, or null when there's no clear match or the lookup fails */
  find: (query: CoverQuery) => Promise<string | null>;
}