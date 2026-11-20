import { Op } from 'sequelize';
import db from '../models';

/**
 * Counts and a cover for the Dashboard (publishers) and the title list,
 * so those pages can show "4 titles · 23 issues" and a cover instead of
 * a bare name.
 *
 * Publishers -> titles (ComicBookTitles.collectpubId)
 * Titles -> issues (ComicBooks.comicbooktitlerelId)
 */

export interface TitleRow {
  id: string;
  collectpubId: string | null;
}

export interface IssueRow {
  comicbooktitlerelId: string | null;
  comicIssue: string | number | null;
  comicBookCover: string | null;
  createdAt: Date | string;
}

export interface PublisherSummary {
  titleCount: number;
  issueCount: number;
  /** Cover of the most recently added issue that has one */
  coverUrl: string | null;
}

export interface TitleSummary {
  issueCount: number;
  /** Cover of the most recently added issue that has one */
  coverUrl: string | null;
  /** Lowest and highest issue numbers, e.g. 401 and 497 */
  firstIssue: number | null;
  lastIssue: number | null;
}

const EMPTY_TITLE: TitleSummary = { issueCount: 0, coverUrl: null, firstIssue: null, lastIssue: null };

const hasCover = (issue: IssueRow): boolean => Boolean(issue.comicBookCover && issue.comicBookCover.trim());

const newestFirst = (a: IssueRow, b: IssueRow): number =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

/** Issue count, issue range and newest cover for each title */
export const summarizeTitles = (titleIds: string[], issues: IssueRow[]): Record<string, TitleSummary> => {
  const result: Record<string, TitleSummary> = {};
  titleIds.forEach(id => {
    result[id] = { ...EMPTY_TITLE };
  });

  const byTitle: Record<string, IssueRow[]> = {};
  issues.forEach(issue => {
    const titleId = issue.comicbooktitlerelId;
    if (!titleId || !result[titleId]) return;
    (byTitle[titleId] = byTitle[titleId] || []).push(issue);
  });

  Object.entries(byTitle).forEach(([titleId, titleIssues]) => {
    // Blank issue numbers don't count (Number('') would be 0)
    const numbers = titleIssues
      .filter(issue => issue.comicIssue !== null && String(issue.comicIssue).trim() !== '')
      .map(issue => Number(issue.comicIssue))
      .filter(number => Number.isFinite(number));
    const newestWithCover = [...titleIssues].sort(newestFirst).find(hasCover);

    result[titleId] = {
      issueCount: titleIssues.length,
      coverUrl: newestWithCover?.comicBookCover ?? null,
      firstIssue: numbers.length ? Math.min(...numbers) : null,
      lastIssue: numbers.length ? Math.max(...numbers) : null,
    };
  });

  return result;
};

/** Title count, issue count and newest cover for each publisher */
export const summarizePublishers = (
  publisherIds: string[],
  titles: TitleRow[],
  issues: IssueRow[]
): Record<string, PublisherSummary> => {
  const publisherOfTitle: Record<string, string> = {};
  const result: Record<string, PublisherSummary> = {};
  publisherIds.forEach(id => {
    result[id] = { titleCount: 0, issueCount: 0, coverUrl: null };
  });

  titles.forEach(title => {
    if (!title.collectpubId || !result[title.collectpubId]) return;
    publisherOfTitle[title.id] = title.collectpubId;
    result[title.collectpubId].titleCount += 1;
  });

  const newest: Record<string, IssueRow> = {};
  issues.forEach(issue => {
    const publisherId = issue.comicbooktitlerelId ? publisherOfTitle[issue.comicbooktitlerelId] : undefined;
    if (!publisherId) return;
    result[publisherId].issueCount += 1;
    if (hasCover(issue) && (!newest[publisherId] || newestFirst(issue, newest[publisherId]) < 0)) {
      newest[publisherId] = issue;
    }
  });

  Object.entries(newest).forEach(([publisherId, issue]) => {
    result[publisherId].coverUrl = issue.comicBookCover;
  });

  return result;
};

// ---------------------------------------------------------------------------
// Loading from the database
// ---------------------------------------------------------------------------

interface FindAllModel<T> {
  findAll: (options: { where: Record<string, unknown>; attributes: string[]; raw: boolean }) => Promise<T[]>;
}

const ISSUE_FIELDS = ['comicbooktitlerelId', 'comicIssue', 'comicBookCover', 'createdAt'];

const loadIssues = (titleIds: string[]): Promise<IssueRow[]> => {
  if (!titleIds.length) return Promise.resolve([]);
  return (db.ComicBooks as unknown as FindAllModel<IssueRow>).findAll({
    where: { comicbooktitlerelId: { [Op.in]: titleIds } },
    attributes: ISSUE_FIELDS,
    raw: true,
  });
};

/** Looks up the titles and issues under these publishers and summarizes them */
export const loadPublisherSummaries = async (publisherIds: string[]): Promise<Record<string, PublisherSummary>> => {
  if (!publisherIds.length) return {};
  const titles = await (db.ComicBookTitles as unknown as FindAllModel<TitleRow>).findAll({
    where: { collectpubId: { [Op.in]: publisherIds } },
    attributes: ['id', 'collectpubId'],
    raw: true,
  });
  const issues = await loadIssues(titles.map(title => title.id));
  return summarizePublishers(publisherIds, titles, issues);
};

/** Looks up the issues under these titles and summarizes them */
export const loadTitleSummaries = async (titleIds: string[]): Promise<Record<string, TitleSummary>> => {
  if (!titleIds.length) return {};
  return summarizeTitles(titleIds, await loadIssues(titleIds));
};