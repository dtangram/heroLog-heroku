import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../models';
import { Op } from 'sequelize';

import {
  buildCollectionFacts,
  CollectionFacts,
  ComicRecord,
  SeriesAnalysis,
} from '../services/collectionFacts';
import {
  AnalysisResult,
  AnalysisSource,
  buildFallbackAnalysis,
  CollectionAnalysis,
  generateCollectionAnalysis,
} from '../services/collectionAnalysis';
import { factsFingerprint, getSavedAnalysis, saveAnalysis } from '../services/analysisCache';

interface CollectionInsights {
  totalComics: number;
  uniqueIssues: number;
  variantCopies: number;
  duplicateCopies: number;
  unnumberedComics: number;
  uniqueSeries: number;
  seriesBreakdown: SeriesAnalysis[];
  topSeries: SeriesAnalysis[];
  analysis: CollectionAnalysis;
  analysisSource: AnalysisSource;
}

interface InsightsResponse {
  success: boolean;
  data?: CollectionInsights;
  error?: string;
}

// HELPER FUNCTIONS
const getAnthropicClient = (): Anthropic => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  return new Anthropic({ apiKey });
};

const getComicBookModel = () => {
  return (db as any).ComicBooks || (db as any).ComicBook;
};

const getComicBookTitleModel = () => {
  return (db as any).ComicBookTitles || (db as any).ComicBookTitle;
};

const emptyInsights = (summary: string): CollectionInsights => ({
  totalComics: 0,
  uniqueIssues: 0,
  variantCopies: 0,
  duplicateCopies: 0,
  unnumberedComics: 0,
  uniqueSeries: 0,
  seriesBreakdown: [],
  topSeries: [],
  analysis: { summary, highlights: [], recommendations: [], observation: '' },
  analysisSource: 'fallback',
});

const toInsights = (
  facts: CollectionFacts,
  analysis: CollectionAnalysis,
  analysisSource: AnalysisSource
): CollectionInsights => ({
  totalComics: facts.totalComics,
  uniqueIssues: facts.uniqueIssues,
  variantCopies: facts.variantCopies,
  duplicateCopies: facts.duplicateCopies,
  unnumberedComics: facts.unnumberedComics,
  uniqueSeries: facts.uniqueSeries,
  seriesBreakdown: facts.series,
  topSeries: facts.series.slice(0, 10),
  analysis,
  analysisSource,
});

// CONTROLLER
export const getCollectionInsights = async (
  req: Request<{ userId: string }>,
  res: Response<InsightsResponse>
): Promise<Response> => {
  const { userId } = req.params;
  
  console.log('Analyzing collection for user:', userId);
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }
  
  try {
    const ComicBooks = getComicBookModel();
    const ComicBookTitles = getComicBookTitleModel();
    const CollectionPublishers = (db as any).CollectionPublishers || (db as any).CollectionPublisher;
    
    if (!ComicBooks || !ComicBookTitles || !CollectionPublishers) {
      throw new Error('Comic book models not loaded');
    }
    
    // Step 1: Get user's publishers
    const userPublishers = await CollectionPublishers.findAll({
      where: { collectpubUsersId: userId },
      attributes: ['id']
    });
    
    console.log(`Found ${userPublishers.length} publishers for user`);
    
    if (userPublishers.length === 0) {
      return res.status(200).json({
        success: true,
        data: emptyInsights('Your collection is just beginning! Add some comics to get personalized insights.')
      });
    }
    
    const publisherIds = userPublishers.map((p: any) => p.id);
    
    // Step 2: Get titles for those publishers
    const userTitles = await ComicBookTitles.findAll({
      where: { collectpubId: { [Op.in]: publisherIds } },
      attributes: ['id', 'cbTitle']
    });
    
    console.log(`Found ${userTitles.length} titles`);
    
    if (userTitles.length === 0) {
      return res.status(200).json({
        success: true,
        data: emptyInsights('Your collection is just beginning! Add some comics to get personalized insights.')
      });
    }
    
    const titleIds = userTitles.map((t: any) => t.id);
    
    // Step 3: Get all comics for those titles
    const comicBooks = await ComicBooks.findAll({
      where: {
        comicbooktitlerelId: { [Op.in]: titleIds }
      }
    });
    
    console.log(`Found ${comicBooks.length} comics`);
    
    if (comicBooks.length === 0) {
      return res.status(200).json({
        success: true,
        data: emptyInsights('You have publishers and titles set up. Now add some comic book issues to see insights!')
      });
    }
    
    // Create a map of title IDs to title names
    const titleMap = new Map<string, string>();
    userTitles.forEach((t: any) => {
      titleMap.set(t.id, t.cbTitle);
    });
    
    // Convert to plain objects with proper title names
    const comics: ComicRecord[] = comicBooks.map((cb: any) => ({
      title: titleMap.get(cb.comicbooktitlerelId) || cb.title || 'Unknown',
      comicIssue: cb.comicIssue,
      type: cb.type,
    }));
    
    // Every number on the page comes from here, not from the model
    const facts = buildCollectionFacts(comics);
    console.log(`Analyzed ${facts.uniqueSeries} unique series`);
    
    // Same collection as last time: show the analysis the collector already saw
    const analysisStore = (db as any).CollectionAnalyses;
    const factsHash = factsFingerprint(facts);
    const saved = analysisStore ? await getSavedAnalysis(analysisStore, userId, factsHash) : null;

    if (saved) {
      console.log('Using saved AI analysis (collection unchanged)');
      return res.status(200).json({
        success: true,
        data: toInsights(facts, saved, 'ai')
      });
    }
    
    // Grounded AI analysis: validated against the facts, with a data-only fallback
    console.log('Generating AI insights...');
    const result: AnalysisResult = process.env.ANTHROPIC_API_KEY
      ? await generateCollectionAnalysis(facts, getAnthropicClient())
      : { analysis: buildFallbackAnalysis(facts), source: 'fallback', attempts: 0, rejected: [] };
    console.log(
      `Insights generated (source: ${result.source}, attempts: ${result.attempts}, rejected: ${result.rejected.length})`
    );

    // Only a validated AI answer is saved; after a fallback, the next visit tries again
    if (result.source === 'ai' && analysisStore) {
      await saveAnalysis(analysisStore, userId, factsHash, result.analysis);
    }
    
    const insights = toInsights(facts, result.analysis, result.source);
    
    return res.status(200).json({
      success: true,
      data: insights
    });
    
  } catch (error) {
    console.error('Error generating insights:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate insights'
    });
  }
};