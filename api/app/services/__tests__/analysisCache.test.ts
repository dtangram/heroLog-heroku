/// <reference types="jest" />
import { buildCollectionFacts, ComicRecord } from '../collectionFacts';
import { AnalysisStore, factsFingerprint, getSavedAnalysis, saveAnalysis } from '../analysisCache';
import { CollectionAnalysis } from '../collectionAnalysis';

const comic = (title: string, comicIssue: string, type = 'regular'): ComicRecord => ({ title, comicIssue, type });

const batman = [comic('Batman', '497'), comic('Batman', '498'), comic('Batman', '500')];

const analysis: CollectionAnalysis = {
  summary: 'You are building a Knightfall run.',
  highlights: ['Batman #497 is where Bane breaks Batman.'],
  recommendations: [{ series: 'Batman', issues: [499], reason: 'It fills the gap.' }],
  observation: '',
};

/** An in-memory stand-in for the CollectionAnalyses model. */
const memoryStore = () => {
  const rows = new Map<string, any>();
  const store: AnalysisStore = {
    findOne: jest.fn(async ({ where }) => rows.get(where.analysisUsersId) ?? null),
    upsert: jest.fn(async values => {
      rows.set(values.analysisUsersId, values);
    }),
  };
  return { store, rows };
};

describe('factsFingerprint', () => {
  it('is the same for the same collection, in any order', () => {
    const a = factsFingerprint(buildCollectionFacts(batman));
    const b = factsFingerprint(buildCollectionFacts([...batman].reverse()));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when a comic is added, removed or becomes a variant', () => {
    const base = factsFingerprint(buildCollectionFacts(batman));
    expect(factsFingerprint(buildCollectionFacts([...batman, comic('Batman', '499')]))).not.toBe(base);
    expect(factsFingerprint(buildCollectionFacts(batman.slice(1)))).not.toBe(base);
    expect(factsFingerprint(buildCollectionFacts([...batman, comic('Batman', '500', 'variant')]))).not.toBe(base);
  });
});

describe('getSavedAnalysis and saveAnalysis', () => {
  it('returns the saved analysis while the collection is unchanged', async () => {
    const { store } = memoryStore();
    await saveAnalysis(store, 'user-1', 'hash-a', analysis);
    await expect(getSavedAnalysis(store, 'user-1', 'hash-a')).resolves.toEqual(analysis);
  });

  it('returns null once the collection changes, or for another user', async () => {
    const { store } = memoryStore();
    await saveAnalysis(store, 'user-1', 'hash-a', analysis);
    await expect(getSavedAnalysis(store, 'user-1', 'hash-b')).resolves.toBeNull();
    await expect(getSavedAnalysis(store, 'user-2', 'hash-a')).resolves.toBeNull();
  });

  it('keeps one analysis per user, replacing the old one', async () => {
    const { store, rows } = memoryStore();
    await saveAnalysis(store, 'user-1', 'hash-a', analysis);
    await saveAnalysis(store, 'user-1', 'hash-b', { ...analysis, summary: 'Updated.' });
    expect(rows.size).toBe(1);
    await expect(getSavedAnalysis(store, 'user-1', 'hash-b')).resolves.toMatchObject({ summary: 'Updated.' });
  });

  it('reads Sequelize rows through get({ plain: true })', async () => {
    const row = { get: () => ({ factsHash: 'hash-a', analysis }) };
    const store: AnalysisStore = { findOne: async () => row, upsert: async () => undefined };
    await expect(getSavedAnalysis(store, 'user-1', 'hash-a')).resolves.toEqual(analysis);
  });

  it('never breaks the page when the database fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken: AnalysisStore = {
      findOne: async () => { throw new Error('connection lost'); },
      upsert: async () => { throw new Error('connection lost'); },
    };
    await expect(getSavedAnalysis(broken, 'user-1', 'hash-a')).resolves.toBeNull();
    await expect(saveAnalysis(broken, 'user-1', 'hash-a', analysis)).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});