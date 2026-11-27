import { createHash } from 'crypto';
import { CollectionFacts } from './collectionFacts';
import db from '../models';
import {
  ANALYSIS_MODEL,
  ANALYSIS_VERSION,
  buildFactsPayload,
  CollectionAnalysis,
} from './collectionAnalysis';

/** The subset of the CollectionAnalyses model this module uses (easy to mock). */
export interface SavedAnalysis {
  analysisUsersId: string;
  factsHash: string;
  analysis: CollectionAnalysis;
}

export interface AnalysisStore {
  findOne: (options: { where: { analysisUsersId: string } }) => Promise<SavedAnalysis | null>;
  upsert: (values: SavedAnalysis) => Promise<void>;
}

/** The CollectionAnalyses table as an AnalysisStore */
export const databaseAnalysisStore: AnalysisStore = {
  findOne: options => db.CollectionAnalyses.findOne(options),
  upsert: async values => {
    await db.CollectionAnalyses.upsert(values);
  },
};

/**
 * Identifies a collection as the AI sees it. Changes when the collector adds,
 * edits or deletes a comic, or when the prompt or model changes.
 */
export const factsFingerprint = (facts: CollectionFacts): string =>
  createHash('sha256')
    .update(JSON.stringify({
      version: ANALYSIS_VERSION,
      model: ANALYSIS_MODEL,
      facts: buildFactsPayload(facts),
    }))
    .digest('hex');

/** The saved analysis for this exact collection, or null. */
export const getSavedAnalysis = async (
  store: AnalysisStore,
  userId: string,
  factsHash: string
): Promise<CollectionAnalysis | null> => {
  try {
    const saved = await store.findOne({ where: { analysisUsersId: userId } });
    return saved && saved.factsHash === factsHash ? saved.analysis : null;
  } catch (error) {
    // A cache problem should never break the page; just ask Claude instead
    console.error('Could not read saved collection analysis:', error);
    return null;
  }
};

/** Saves an AI analysis, replacing the user's previous one. */
export const saveAnalysis = async (
  store: AnalysisStore,
  userId: string,
  factsHash: string,
  analysis: CollectionAnalysis
): Promise<void> => {
  try {
    await store.upsert({ analysisUsersId: userId, factsHash, analysis });
  } catch (error) {
    console.error('Could not save collection analysis:', error);
  }
};