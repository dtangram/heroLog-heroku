import type { ResultGroup, SearchMode } from '../hooks/useSearch';

/** How long a tab remembers its results for the same search */
export const SEARCH_CACHE_MS = 10 * 60 * 1000;

/** After this long, tell the user the search is still running and why. */
export const SLOW_SEARCH_MS = 8000;

/** How often to check a running catch-up of the collection search index */
export const ENRICHMENT_POLL_MS = 3000;

/** Placeholder cards to show while each kind of search runs (a screenful) */
export const SKELETON_COUNT: Record<SearchMode, number> = { collection: 5, all: 6, missing: 6 };

export const SLOW_MESSAGE: Record<SearchMode, string> = {
  collection: 'Still searching your collection…',
  all: 'Still searching every comic. This can take up to 30 seconds.',
  missing: "Still finding the comics you're missing. This can take up to 30 seconds.",
};

/** Group order and headings on the page */
export const RESULT_GROUPS: Array<{ group: ResultGroup; heading: string }> = [
  { group: 'Main story', heading: 'Main story' },
  { group: 'Tie-in', heading: 'Tie-ins' },
  { group: 'Related', heading: 'Related' },
];

/** "main story issues", "tie-ins", "related comics", for the owned notes */
export const OWNED_NOUN: Record<ResultGroup, [string, string]> = {
  'Main story': ['main story issue', 'main story issues'],
  'Tie-in': ['tie-in', 'tie-ins'],
  Related: ['related comic', 'related comics'],
};