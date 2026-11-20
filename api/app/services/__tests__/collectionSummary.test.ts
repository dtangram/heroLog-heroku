/// <reference types="jest" />
jest.mock('../../models', () => ({ __esModule: true, default: {} }));

import { IssueRow, summarizePublishers, summarizeTitles, TitleRow } from '../collectionSummary';

const issue = (titleId: string, comicIssue: string | number | null, cover: string | null, createdAt: string): IssueRow => ({
  comicbooktitlerelId: titleId,
  comicIssue,
  comicBookCover: cover,
  createdAt,
});

const titles: TitleRow[] = [
  { id: 'batman', collectpubId: 'dc' },
  { id: 'detective', collectpubId: 'dc' },
  { id: 'spawn', collectpubId: 'image' },
];

const issues: IssueRow[] = [
  issue('batman', '497', '/batman-497.jpg', '2026-03-01'),
  issue('batman', 401, '/batman-401.jpg', '2026-01-01'),
  issue('batman', '491', '', '2026-05-01'), // newest, but no cover
  issue('detective', '27', '/detective-27.jpg', '2026-04-01'),
  issue('somebody-elses-title', '1', '/other.jpg', '2026-06-01'),
];

describe('summarizeTitles', () => {
  it('counts issues, finds the issue range and the newest cover', () => {
    const result = summarizeTitles(['batman', 'detective'], issues);

    expect(result.batman).toEqual({
      issueCount: 3,
      coverUrl: '/batman-497.jpg',
      firstIssue: 401,
      lastIssue: 497,
    });
    expect(result.detective).toEqual({ issueCount: 1, coverUrl: '/detective-27.jpg', firstIssue: 27, lastIssue: 27 });
  });

  it('gives a title with no issues zero and no cover', () => {
    expect(summarizeTitles(['spawn'], issues).spawn).toEqual({
      issueCount: 0,
      coverUrl: null,
      firstIssue: null,
      lastIssue: null,
    });
  });

  it('leaves blank issue numbers out of the range', () => {
    const result = summarizeTitles(['batman'], [
      issue('batman', '', null, '2026-01-01'),
      issue('batman', null, null, '2026-01-02'),
      issue('batman', '12', null, '2026-01-03'),
    ]);
    expect(result.batman).toMatchObject({ issueCount: 3, firstIssue: 12, lastIssue: 12, coverUrl: null });
  });

  it('ignores issues that belong to titles it was not asked about', () => {
    expect(Object.keys(summarizeTitles(['batman'], issues))).toEqual(['batman']);
  });
});

describe('summarizePublishers', () => {
  it('counts titles and issues and finds the newest cover across all titles', () => {
    const result = summarizePublishers(['dc', 'image'], titles, issues);

    expect(result.dc).toEqual({ titleCount: 2, issueCount: 4, coverUrl: '/detective-27.jpg' });
    expect(result.image).toEqual({ titleCount: 1, issueCount: 0, coverUrl: null });
  });

  it('gives a publisher with no titles zero and no cover', () => {
    expect(summarizePublishers(['marvel'], titles, issues).marvel).toEqual({
      titleCount: 0,
      issueCount: 0,
      coverUrl: null,
    });
  });
});