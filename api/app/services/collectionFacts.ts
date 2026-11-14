/**
 * Collection facts: every number shown on the Collection Intelligence page
 * is computed here, from the database, so the AI never has to count or guess.
 */

export interface ComicRecord {
  title: string;
  /** Stored as STRING(50) in the database, e.g. "500", "#500", "1A". */
  comicIssue: string | number | null | undefined;
  type: 'regular' | 'variant' | string;
}

export type CollectingPattern = 'run' | 'scattered';

export interface SeriesAnalysis {
  seriesName: string;
  /** Unique regular issue numbers owned, ascending. */
  ownedIssues: number[];
  /** Issue numbers between the lowest and highest owned issue that are not owned. */
  missingIssues: number[];
  /** missingIssues compressed into ranges, e.g. ["#401–#496", "#498"]. */
  missingRanges: string[];
  /** Lowest and highest owned issue. */
  span: { first: number; last: number };
  /** Number of issue slots in the span (last - first + 1). */
  totalIssues: number;
  /** Share of the span that is owned, 0–100. */
  completionPercentage: number;
  /** 'run' = collecting consecutive issues; 'scattered' = picking individual issues. */
  pattern: CollectingPattern;
  variants: number;
  /** Extra regular copies of an issue already counted. */
  duplicateCopies: number;
}

export interface CollectionFacts {
  /** Every comic record, including variants, duplicates and unnumbered comics. */
  totalComics: number;
  /** Unique numbered regular issues across all series. */
  uniqueIssues: number;
  variantCopies: number;
  duplicateCopies: number;
  /** Regular comics with no usable issue number. */
  unnumberedComics: number;
  uniqueSeries: number;
  /** Sorted by issues owned, most first. */
  series: SeriesAnalysis[];
}

/** A series counts as a run once at least half of its span is owned. */
export const RUN_THRESHOLD = 50;

export const toRanges = (sorted: number[]): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  for (const n of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && n === last[1] + 1) {
      last[1] = n;
    } else {
      ranges.push([n, n]);
    }
  }
  return ranges;
};

export const formatRanges = (sorted: number[]): string[] =>
  toRanges(sorted).map(([a, b]) => (a === b ? `#${a}` : `#${a}–#${b}`));

/**
 * Parse a stored issue number. "500", " #500 " and 500 become 500.
 * Anything that isn't a plain positive whole number ("1A", "Annual 1", "1/2")
 * returns null and is counted as unnumbered rather than guessed at.
 */
export const parseIssueNumber = (issue: unknown): number | null => {
  if (typeof issue === 'number') {
    return Number.isInteger(issue) && issue > 0 ? issue : null;
  }
  if (typeof issue !== 'string') return null;
  const cleaned = issue.trim().replace(/^#\s*/, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
};

export const buildCollectionFacts = (comics: ComicRecord[]): CollectionFacts => {
  const bySeries = new Map<string, ComicRecord[]>();
  comics.forEach(comic => {
    const key = comic.title || 'Unknown';
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key)!.push(comic);
  });

  let unnumberedComics = 0;
  const series: SeriesAnalysis[] = [];

  bySeries.forEach((seriesComics, seriesName) => {
    const variants = seriesComics.filter(c => c.type === 'variant').length;
    const regular = seriesComics.filter(c => c.type !== 'variant');

    const numbered = regular
      .map(c => parseIssueNumber(c.comicIssue))
      .filter((n): n is number => n !== null);
    unnumberedComics += regular.length - numbered.length;

    const ownedIssues = Array.from(new Set(numbered)).sort((a, b) => a - b);
    const duplicateCopies = numbered.length - ownedIssues.length;

    if (ownedIssues.length === 0) return;

    const first = ownedIssues[0];
    const last = ownedIssues[ownedIssues.length - 1];
    const owned = new Set(ownedIssues);
    const missingIssues: number[] = [];
    for (let i = first; i <= last; i++) {
      if (!owned.has(i)) missingIssues.push(i);
    }

    const totalIssues = last - first + 1;
    const completionPercentage = (ownedIssues.length / totalIssues) * 100;

    series.push({
      seriesName,
      ownedIssues,
      missingIssues,
      missingRanges: formatRanges(missingIssues),
      span: { first, last },
      totalIssues,
      completionPercentage,
      pattern: completionPercentage >= RUN_THRESHOLD ? 'run' : 'scattered',
      variants,
      duplicateCopies,
    });
  });

  series.sort(
    (a, b) =>
      b.ownedIssues.length - a.ownedIssues.length ||
      b.completionPercentage - a.completionPercentage
  );

  return {
    totalComics: comics.length,
    uniqueIssues: series.reduce((sum, s) => sum + s.ownedIssues.length, 0),
    variantCopies: comics.filter(c => c.type === 'variant').length,
    duplicateCopies: series.reduce((sum, s) => sum + s.duplicateCopies, 0),
    unnumberedComics,
    uniqueSeries: series.length,
    series,
  };
};