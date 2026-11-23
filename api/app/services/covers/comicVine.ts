import axios from 'axios';
import { CoverQuery, CoverSource } from './types';

/**
 * Cover source: Comic Vine (https://comicvine.gamespot.com/api).
 *
 * Comic Vine's terms: non-commercial use only (Hero-Log is a portfolio
 * piece), a link back to Comic Vine on any page that shows its data, and its
 * data may not be reproduced elsewhere. So Hero-Log stores the link to Comic
 * Vine's own image instead of copying the image into its own storage.
 *
 * Needs COMIC_VINE_API_KEY. Without it, lookups are skipped and comics keep
 * the placeholder until someone adds a cover.
 */

const API_URL = 'https://comicvine.gamespot.com/api/issues/';

/** Comic Vine allows 200 requests per resource per hour; a lookup is one request */
const TIMEOUT_MS = 8000;

interface ComicVineIssue {
  issue_number?: string;
  cover_date?: string | null;
  image?: { medium_url?: string; original_url?: string } | null;
  volume?: { name?: string } | null;
}

/** A series name in one form: "The Amazing Spider-Man" and "amazing spider-man" match */
export const normalizeSeries = (name: string): string =>
  String(name)
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Comic Vine's stand-in picture for an issue without a cover */
const isPlaceholder = (url: string): boolean => /\/(img|images)\/(blank|default|image_not_available)/i.test(url);

/**
 * The matching issue's cover, or null when there's no clear match. Several
 * series can share a name (Batman began again in 1940, 2011 and 2016), so a
 * match needs the same series name and, when known, the same year; without a
 * year it must be the only issue with that number in a series of that name.
 */
export const pickCover = (issues: ComicVineIssue[], query: CoverQuery): string | null => {
  const series = normalizeSeries(query.series);
  const year = query.year ? String(query.year) : '';

  const sameSeries = issues.filter(issue => normalizeSeries(issue.volume?.name ?? '') === series);
  const matches = year
    ? sameSeries.filter(issue => (issue.cover_date ?? '').startsWith(year))
    : sameSeries;

  if (matches.length !== 1) return null;

  const url = matches[0].image?.medium_url || matches[0].image?.original_url || '';
  return url && !isPlaceholder(url) ? url : null;
};

/** Looks up a cover; any failure just means no cover */
const find = async (query: CoverQuery): Promise<string | null> => {
  const apiKey = process.env.COMIC_VINE_API_KEY;
  const issue = String(query.issue ?? '').trim();
  if (!apiKey || !query.series?.trim() || !issue) return null;

  const filters = [`issue_number:${issue}`];
  if (query.year) filters.push(`cover_date:${query.year}-01-01|${query.year}-12-31`);

  try {
    const response = await axios.get(API_URL, {
      params: {
        api_key: apiKey,
        format: 'json',
        field_list: 'issue_number,cover_date,image,volume',
        filter: filters.join(','),
        limit: 100,
      },
      // Comic Vine has been known to refuse requests that don't identify the app
      headers: { 'User-Agent': 'Hero-Log (portfolio comic collection app)' },
      timeout: TIMEOUT_MS,
    });

    return pickCover(response.data?.results ?? [], query);
  } catch (error) {
    // The API key is in the request URL, so log only the status, never the request
    const status = (error as any)?.response?.status ?? (error as Error).message;
    console.warn(`Comic Vine cover lookup failed for ${query.series} #${issue}: ${status}`);
    return null;
  }
};

const comicVine: CoverSource = {
  name: 'Comic Vine',
  isAvailable: () => Boolean(process.env.COMIC_VINE_API_KEY),
  find,
};

export default comicVine;