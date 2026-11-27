import db from '../models';
import type { ApiResult } from '../types/api';
import type { JsonValue } from '../types/json';

export type DuplicateKind = 'publisher' | 'title' | 'issue';

/** Sent with a 409 so the app can explain the problem and, for issues, offer to save anyway. */
export interface DuplicateMatch {
  kind: DuplicateKind;
  /** The record that already exists */
  id: string;
  /** How to name it to the user, e.g. "DC Comics" or "Detective Comics #659" */
  name: string;
  /** Issues only: the user may confirm and save a second copy */
  canSaveAnyway: boolean;
}

/** Words publishers add to their name that don't change which publisher it is. */
const PUBLISHER_SUFFIXES = /\b(comics?|publishing|publications|entertainment|press|group|inc|llc|ltd|co)\b/g;

/** Lower case, no punctuation, single spaces: "  Detective  Comics. " -> "detective comics" */
/** Text, numbers or nothing: what names, issue numbers and volumes arrive as */
export type MatchValue = string | number | null | undefined;

export const normalizeName = (value: MatchValue): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "DC", "DC Comics" and "D.C. Comics, Inc." all become "d c" or "dc"; compare with spaces removed. */
export const normalizePublisher = (value: MatchValue): string => {
  const name = normalizeName(value);
  const core = name.replace(PUBLISHER_SUFFIXES, ' ').replace(/\s+/g, '');
  // A publisher called just "Comics" keeps its name
  return core || name.replace(/\s+/g, '');
};

/** "#0659", "659" and " 659 " are the same issue number. */
export const normalizeIssue = (value: MatchValue): string => {
  const text = String(value ?? '').trim().replace(/^#/, '').toLowerCase();
  return /^\d+$/.test(text) ? String(Number(text)) : text;
};

const sameOptional = (a: MatchValue, b: MatchValue) => {
  const left = normalizeName(a);
  const right = normalizeName(b);
  // A blank volume matches any volume, so "#659" and "#659 vol 1" still match
  return !left || !right || left === right;
};

interface PublisherRow { id: string; publisherName: string }
interface TitleRow { id: string; cbTitle: string }
/** What makes two issues the same: number, volume and cover type */
export interface IssueIdentity {
  comicIssue?: MatchValue;
  volume?: MatchValue;
  type?: string | null;
}

interface IssueRow { id: string; title: string; comicIssue: MatchValue; volume?: MatchValue; type?: string | null }

/** Pure matchers, so the rules can be tested without a database. */
export const matchPublisher = (rows: PublisherRow[], name: string, excludeId?: string): DuplicateMatch | null => {
  const wanted = normalizePublisher(name);
  const match = rows.find(row => row.id !== excludeId && normalizePublisher(row.publisherName) === wanted);
  return match ? { kind: 'publisher', id: match.id, name: match.publisherName, canSaveAnyway: false } : null;
};

export const matchTitle = (rows: TitleRow[], name: string, excludeId?: string): DuplicateMatch | null => {
  const wanted = normalizeName(name);
  const match = rows.find(row => row.id !== excludeId && normalizeName(row.cbTitle) === wanted);
  return match ? { kind: 'title', id: match.id, name: match.cbTitle, canSaveAnyway: false } : null;
};

export const matchIssue = (
  rows: IssueRow[],
  issue: IssueIdentity,
  excludeId?: string
): DuplicateMatch | null => {
  const wanted = normalizeIssue(issue.comicIssue);
  if (!wanted) return null;
  const wantedType = String(issue.type || 'regular');
  const match = rows.find(
    row =>
      row.id !== excludeId &&
      normalizeIssue(row.comicIssue) === wanted &&
      String(row.type || 'regular') === wantedType &&
      sameOptional(row.volume, issue.volume)
  );
  if (!match) return null;
  const variant = wantedType === 'variant' ? ' (variant cover)' : '';
  return { kind: 'issue', id: match.id, name: `${match.title} #${normalizeIssue(match.comicIssue)}${variant}`, canSaveAnyway: true };
};

/** What the 409 response says, e.g. "You already have DC Comics." */
export const duplicateMessage = (match: DuplicateMatch): string => {
  switch (match.kind) {
    case 'publisher':
      return `You already have a publisher called ${match.name}.`;
    case 'title':
      return `You already have ${match.name} under this publisher.`;
    default:
      return `You already have ${match.name} in this list.`;
  }
};

// Database lookups. Each reads only the user's own rows for one parent, so they stay small.

export const findDuplicatePublisher = async (userId: string, name: string, excludeId?: string) => {
  const rows = await db.CollectionPublishers.findAll({
    where: { collectpubUsersId: userId },
    attributes: ['id', 'publisherName'],
    raw: true,
  });
  return matchPublisher(rows, name, excludeId);
};

export const findDuplicateTitle = async (publisherId: string, name: string, excludeId?: string) => {
  const rows = await db.ComicBookTitles.findAll({
    where: { collectpubId: publisherId },
    attributes: ['id', 'cbTitle'],
    raw: true,
  });
  return matchTitle(rows, name, excludeId);
};

export const findDuplicateIssue = async (
  titleId: string,
  issue: IssueIdentity,
  excludeId?: string
) => {
  const wanted = normalizeIssue(issue.comicIssue);
  if (!wanted) return null;
  const rows = await db.ComicBooks.findAll({
    // One title's issues: a few hundred rows at most, and this catches "#0659" as well as "659"
    where: { comicbooktitlerelId: titleId },
    attributes: ['id', 'title', 'comicIssue', 'volume', 'type'],
    raw: true,
  });
  return matchIssue(rows, issue, excludeId);
};

/** True when the request says the user has already confirmed saving a second copy. */
export const allowsDuplicate = (body: { allowDuplicate?: JsonValue } | undefined): boolean =>
  body?.allowDuplicate === true;

/** The 409 reply that refuses the save and says what already exists. */
export const duplicateResult = (match: DuplicateMatch): ApiResult => ({
  success: false,
  error: duplicateMessage(match),
  duplicate: match,
});