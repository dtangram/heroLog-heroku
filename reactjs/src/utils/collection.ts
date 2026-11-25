export const countLabel = (count: number | null | undefined, singular: string, plural = `${singular}s`): string => {
  const n = Number(count) || 0;
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : plural}`;
};

export const issueRange = (first: number | null | undefined, last: number | null | undefined): string | null => {
  if (first === null || first === undefined) return null;
  if (last === null || last === undefined || last === first) return `#${first}`;
  return `#${first}–#${last}`;
};

export const splitEmpty = <T,>(items: T[], hasContents: (item: T) => boolean): { cards: T[]; empty: T[] } => {
  if (!items.some(hasContents)) return { cards: items, empty: [] };
  return { cards: items.filter(hasContents), empty: items.filter(item => !hasContents(item)) };
};

export const comicsOf = (title: string): string => {
  const name = title.trim();
  return /\bcomics?$/i.test(name) ? name : `${name} Comics`;
};

/** Words publishers add to their name that don't change which publisher it is */
const PUBLISHER_SUFFIXES = /\b(comics?|publishing|publications|entertainment|press|group|inc|llc|ltd|co)\b/g;

/** "DC", "DC Comics" and "D.C. Comics, Inc." all become "dc" (the same rule the API uses for duplicates) */
export const publisherKey = (name: string): string => {
  const plain = name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.replace(PUBLISHER_SUFFIXES, ' ').replace(/\s+/g, '') || plain.replace(/\s+/g, '');
};

export const matchPublisherName = (typed: string, known: string[]): string => {
  const name = typed.trim();
  if (!name) return name;
  const key = publisherKey(name);
  return known.find(existing => publisherKey(existing) === key) ?? name;
};