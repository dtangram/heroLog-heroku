import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../models';
import { Op } from 'sequelize';

interface Comic {
  id: string;
  title: string;
  comicIssue: number;
  comicBookVolume?: number;
  comicBookYear?: number;
  type: 'regular' | 'variant';
  comicBookTitle?: string;
  comicbooktitlerelId?: string;
}

interface SeriesAnalysis {
  seriesName: string;
  totalIssues: number;
  ownedIssues: number[];
  missingIssues: number[];
  completionPercentage: number;
  variants: number;
}

interface CollectionInsights {
  totalComics: number;
  uniqueSeries: number;
  seriesBreakdown: SeriesAnalysis[];
  topSeries: SeriesAnalysis[];
  recommendations: string[];
  aiInsights: string;
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

const analyzeSeriesCompleteness = (comics: Comic[]): SeriesAnalysis[] => {
  const seriesMap = new Map<string, Comic[]>();
  
  // Group comics by series
  comics.forEach(comic => {
    const seriesKey = comic.title || comic.comicBookTitle || 'Unknown';
    if (!seriesMap.has(seriesKey)) {
      seriesMap.set(seriesKey, []);
    }
    seriesMap.get(seriesKey)!.push(comic);
  });
  
  // Analyze each series
  const analyses: SeriesAnalysis[] = [];
  
  seriesMap.forEach((seriesComics, seriesName) => {
    const regularComics = seriesComics.filter(c => c.type === 'regular');
    const variants = seriesComics.filter(c => c.type === 'variant').length;
    
    const ownedIssues = regularComics
      .map(c => c.comicIssue)
      .filter(issue => issue && issue > 0)
      .sort((a, b) => a - b);
    
    if (ownedIssues.length === 0) return;
    
    const minIssue = Math.min(...ownedIssues);
    const maxIssue = Math.max(...ownedIssues);
    
    // Determine missing issues in the range
    const missingIssues: number[] = [];
    for (let i = minIssue; i <= maxIssue; i++) {
      if (!ownedIssues.includes(i)) {
        missingIssues.push(i);
      }
    }
    
    const totalIssues = maxIssue - minIssue + 1;
    const completionPercentage = (ownedIssues.length / totalIssues) * 100;
    
    analyses.push({
      seriesName,
      totalIssues,
      ownedIssues,
      missingIssues,
      completionPercentage,
      variants
    });
  });
  
  return analyses.sort((a, b) => b.completionPercentage - a.completionPercentage);
};

const generateAIInsights = async (
  analyses: SeriesAnalysis[],
  totalComics: number
): Promise<string> => {
  const anthropic = getAnthropicClient();
  
  // Prepare data summary for Claude
  const topSeries = analyses.slice(0, 5);
  const summaryData = {
    totalComics,
    uniqueSeries: analyses.length,
    topSeries: topSeries.map(s => ({
      name: s.seriesName,
      owned: s.ownedIssues.length,
      total: s.totalIssues,
      completion: Math.round(s.completionPercentage),
      missing: s.missingIssues.length
    }))
  };
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a comic book collection advisor. Analyze this collection and provide personalized insights.

Collection Summary:
${JSON.stringify(summaryData, null, 2)}

Provide a brief, friendly analysis covering:
1. Overall collection health (2-3 sentences)
2. Notable achievements (e.g., near-complete series)
3. Smart recommendations for gaps to fill
4. One interesting observation about the collection

Keep it concise, encouraging, and actionable. Write in 2nd person ("You have...", "Your collection...").`
      }]
    });
    
    const insightText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');
    
    return insightText;
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return 'Your collection shows great potential! Keep adding to your favorite series.';
  }
};

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
        data: {
          totalComics: 0,
          uniqueSeries: 0,
          seriesBreakdown: [],
          topSeries: [],
          recommendations: ['Start building your collection by adding your first comic!'],
          aiInsights: 'Your collection is just beginning! Add some comics to get personalized insights.'
        }
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
        data: {
          totalComics: 0,
          uniqueSeries: 0,
          seriesBreakdown: [],
          topSeries: [],
          recommendations: ['Start building your collection by adding your first comic!'],
          aiInsights: 'Your collection is just beginning! Add some comics to get personalized insights.'
        }
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
        data: {
          totalComics: 0,
          uniqueSeries: 0,
          seriesBreakdown: [],
          topSeries: [],
          recommendations: ['Start adding issues to your comic book titles!'],
          aiInsights: 'You have publishers and titles set up. Now add some comic book issues to see insights!'
        }
      });
    }
    
    // Create a map of title IDs to title names
    const titleMap = new Map<string, string>();
    userTitles.forEach((t: any) => {
      titleMap.set(t.id, t.cbTitle);
    });
    
    // Convert to plain objects with proper title names
    const comics: Comic[] = comicBooks.map((cb: any) => ({
      id: cb.id,
      title: titleMap.get(cb.comicbooktitlerelId) || cb.title || 'Unknown',
      comicIssue: cb.comicIssue,
      comicBookVolume: cb.comicBookVolume,
      comicBookYear: cb.comicBookYear,
      type: cb.type,
      comicbooktitlerelId: cb.comicbooktitlerelId
    }));
    
    // Analyze series completeness
    const seriesAnalyses = analyzeSeriesCompleteness(comics);
    const topSeries = seriesAnalyses.slice(0, 10);
    
    console.log(`Analyzed ${seriesAnalyses.length} unique series`);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    topSeries.forEach(series => {
      if (series.completionPercentage >= 80 && series.completionPercentage < 100) {
        const missingCount = series.missingIssues.length;
        const missingList = series.missingIssues.slice(0, 3).join(', ');
        recommendations.push(
          `Complete ${series.seriesName}! You're ${Math.round(series.completionPercentage)}% done. ` +
          `Missing ${missingCount} issue${missingCount > 1 ? 's' : ''}: #${missingList}${missingCount > 3 ? '...' : ''}`
        );
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Keep building your collection across different series!');
    }
    
    // Generate AI insights
    console.log('Generating AI insights...');
    const aiInsights = await generateAIInsights(seriesAnalyses, comics.length);
    
    const insights: CollectionInsights = {
      totalComics: comics.length,
      uniqueSeries: seriesAnalyses.length,
      seriesBreakdown: seriesAnalyses,
      topSeries,
      recommendations: recommendations.slice(0, 5),
      aiInsights
    };
    
    console.log('Insights generated successfully');
    
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