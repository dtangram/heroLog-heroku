import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { CollectionFacts, SeriesAnalysis } from './collectionFacts';

export interface Recommendation {
  series: string;
  issues: number[];
  reason: string;
}

export interface CollectionAnalysis {
  summary: string;
  highlights: string[];
  recommendations: Recommendation[];
  observation: string;
}

export type AnalysisSource = 'ai' | 'fallback';

export interface AnalysisResult {
  analysis: CollectionAnalysis;
  source: AnalysisSource;
  attempts: number;
  /** Problems found in rejected attempts, for logging. */
  rejected: string[][];
}

/** The subset of the Anthropic client this module uses (easy to mock). */
export interface MessagesClient {
  messages: { create: (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message> };
}

export const ANALYSIS_MODEL = 'claude-haiku-4-5-20251001';
/**
 * Bump when the prompt, tool schema or validation changes, so saved analyses
 * (services/analysisCache.ts) are written again with the new rules.
 */
export const ANALYSIS_VERSION = 2;
const TOOL_NAME = 'record_collection_analysis';
const MAX_SERIES_IN_PROMPT = 10;
const MAX_MISSING_IN_PROMPT = 30;

export const ANALYSIS_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Record your analysis of the collector's comic collection.",
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: '2–3 sentences on the collection as a whole. Plain text.',
      },
      highlights: {
        type: 'array',
        maxItems: 3,
        items: { type: 'string' },
        description:
          'Up to 3 notable things about what the collector already owns. Only mention issue numbers listed in owned_issues.',
      },
      recommendations: {
        type: 'array',
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            series: { type: 'string', description: 'Series name.' },
            issues: {
              type: 'array',
              items: { type: 'integer' },
              description:
                'Issue numbers to look for. For a series the collector has, never include an owned issue. May be empty for a story arc or collected edition.',
            },
            reason: { type: 'string', description: 'One sentence on why.' },
          },
          required: ['series', 'issues', 'reason'],
        },
      },
      observation: {
        type: 'string',
        description: 'One interesting, accurate observation about the collection.',
      },
    },
    required: ['summary', 'highlights', 'recommendations', 'observation'],
  },
};

export const SYSTEM_PROMPT = `You are a comic book collection advisor inside the Hero-Log app. You receive facts computed from the collector's database.

Rules:
- The facts are the only source of truth about what the collector owns. Never say or imply they own an issue that isn't in owned_issues for that series.
- In summary, highlights and observation, only mention issue numbers the collector owns. Put issues they should look for in recommendations.
- Don't restate counts or percentages; the page already shows them. If you reference one, copy it exactly from the facts.
- "scattered" series: the collector picks individual issues instead of completing a run. Don't describe the numbers between them as missing or call the collection incomplete. Recommend standout issues or story arcs instead.
- "run" series: recommend specific issues from missing_issues. A run only covers the span between the first and last issue owned; never call a series complete, a complete run or a full run.
- Every highlight and the observation must tell the collector something they can't see by looking at their list: a story arc, a key issue, a creator, or why an issue matters. Don't say issues are consecutive, continue a sequence, or begin or end a run.
- Plain text only: no markdown, headings, bullet characters or emoji.
- Address the collector as "you". Be concise, accurate and encouraging.

Call ${TOOL_NAME} with your analysis.`;

const round = (n: number) => Math.round(n);

export const buildFactsPayload = (facts: CollectionFacts) => ({
  totals: {
    total_comics: facts.totalComics,
    unique_issues: facts.uniqueIssues,
    variant_copies: facts.variantCopies,
    duplicate_copies: facts.duplicateCopies,
    unnumbered_comics: facts.unnumberedComics,
    series_count: facts.uniqueSeries,
  },
  series: facts.series.slice(0, MAX_SERIES_IN_PROMPT).map(s => ({
    name: s.seriesName,
    pattern: s.pattern,
    owned_issues: s.ownedIssues,
    owned_count: s.ownedIssues.length,
    span: `#${s.span.first}–#${s.span.last}`,
    // Only measures the span between the first and last owned issue, not the whole series
    percent_of_span_owned: round(s.completionPercentage),
    missing_count: s.missingIssues.length,
    ...(s.pattern === 'run'
      ? { missing_issues: s.missingIssues.slice(0, MAX_MISSING_IN_PROMPT) }
      : {}),
    variants: s.variants,
    duplicate_copies: s.duplicateCopies,
  })),
});

// ---------- Output cleanup and validation ----------

/** Strip markdown the model may still emit, so it never shows raw on the page. */
export const toPlainText = (text: string): string =>
  text
    .split('\n')
    .map(line =>
      line
        .replace(/^\s*#{1,6}\s+/, '') // headings ("## Title"), not "#500"
        .replace(/^\s*[-*•]\s+/, '') // bullets
        .replace(/(\*\*|__|`)/g, '')
        .trim()
    )
    .filter(Boolean)
    .join(' ')
    .trim();

const recommendationSchema = z.object({
  series: z.string(),
  issues: z.array(z.number().int()),
  reason: z.string(),
});

/**
 * Check Claude's tool input matches the schema; returns a cleaned copy or
 * the problems, which are sent back to Claude so it can correct them.
 */
export const parseAnalysis = (
  toolUse: Anthropic.ToolUseBlock
): { analysis?: CollectionAnalysis; errors: string[] } => {
  const input = z.looseObject({}).safeParse(toolUse.input);
  if (!input.success) return { errors: ['Tool input was not an object.'] };

  const summary = z.string().safeParse(input.data.summary);
  const observation = z.string().safeParse(input.data.observation);
  const highlights = z.array(z.string()).safeParse(input.data.highlights);
  const recommendations = z.array(recommendationSchema).safeParse(input.data.recommendations);

  const errors: string[] = [];
  if (!summary.success || !summary.data.trim()) errors.push('summary must be a non-empty string.');
  if (!observation.success) errors.push('observation must be a string.');
  if (!highlights.success) errors.push('highlights must be an array of strings.');
  if (!recommendations.success)
    errors.push('recommendations must be an array of {series, issues: integer[], reason}.');

  if (!summary.success || !observation.success || !highlights.success || !recommendations.success || errors.length) {
    return { errors };
  }

  return {
    errors,
    analysis: {
      summary: toPlainText(summary.data),
      highlights: highlights.data.slice(0, 3).map(toPlainText).filter(Boolean),
      recommendations: recommendations.data.slice(0, 4).map(r => ({
        series: toPlainText(r.series),
        issues: Array.from(new Set(r.issues)),
        reason: toPlainText(r.reason),
      })),
      observation: toPlainText(observation.data),
    },
  };
};

const findSeries = (facts: CollectionFacts, name: string): SeriesAnalysis | undefined =>
  facts.series.find(s => s.seriesName.toLowerCase() === name.trim().toLowerCase());

/**
 * Which series an "#N" refers to: the series named directly before it
 * ("Batman #500"), or undefined if none is.
 */
const seriesBefore = (facts: CollectionFacts, text: string, index: number) => {
  const before = text.slice(Math.max(0, index - 80), index).toLowerCase().trimEnd();
  return facts.series
    .filter(s => before.endsWith(s.seriesName.toLowerCase()))
    .sort((a, b) => b.seriesName.length - a.seriesName.length)[0];
};

/** Every number of comics the page could legitimately mention. */
const allowedCounts = (facts: CollectionFacts): Set<number> => {
  const counts = new Set<number>([
    facts.totalComics,
    facts.uniqueIssues,
    facts.variantCopies,
    facts.duplicateCopies,
    facts.unnumberedComics,
    facts.uniqueSeries,
  ]);
  facts.series.forEach(s => {
    counts.add(s.ownedIssues.length);
    counts.add(s.missingIssues.length);
    counts.add(s.totalIssues);
    counts.add(s.variants);
  });
  return counts;
};

const ISSUE_REF = /#\s?(\d+)/g;
const COUNT_REF = /\b(\d+)\s+(?:comics?|issues?|books?|copies|series|variants?)\b/gi;
const PERCENT_REF = /\b(\d+(?:\.\d+)?)\s?%/g;

/**
 * Check one piece of text. ownedOnly: every "#N" must be an issue the collector
 * owns. extraAllowed: issue numbers also allowed (a recommendation's own issues).
 */
const checkText = (
  facts: CollectionFacts,
  field: string,
  text: string,
  extraAllowed: Set<number> = new Set()
): string[] => {
  const errors: string[] = [];
  const ownedAnywhere = new Set(facts.series.flatMap(s => s.ownedIssues));

  for (const match of text.matchAll(ISSUE_REF)) {
    const issue = Number(match[1]);
    if (extraAllowed.has(issue)) continue;
    const series = seriesBefore(facts, text, match.index ?? 0);
    const owned = series ? series.ownedIssues.includes(issue) : ownedAnywhere.has(issue);
    if (!owned) {
      errors.push(
        `${field} mentions ${series ? `${series.seriesName} ` : ''}#${issue}, which the collector does not own. Only mention owned issues here; put wanted issues in recommendations.`
      );
    }
  }

  const counts = allowedCounts(facts);
  for (const match of text.matchAll(COUNT_REF)) {
    if (!counts.has(Number(match[1]))) {
      errors.push(`${field} says "${match[0]}", which doesn't match the facts. Don't restate counts.`);
    }
  }

  const percents = new Set(facts.series.map(s => round(s.completionPercentage)));
  for (const match of text.matchAll(PERCENT_REF)) {
    if (!percents.has(round(Number(match[1])))) {
      errors.push(`${field} says "${match[0]}", which doesn't match the facts. Don't restate percentages.`);
    }
  }
  return errors;
};

/**
 * Lines that only restate what the list already shows ("Issue 660 continues the
 * sequence") or overclaim ("a complete run"). Checked in the summary, highlights
 * and observation.
 */
const FILLER = [
  /\bcontinu(?:es|ing) (?:the|your|this) (?:sequence|run|series|numbering)\b/i,
  /\bconsecutive\b/i,
  /\bin (?:numerical )?sequence\b/i,
  /\b(?:marks|is) the (?:beginning|start|end) of (?:your|the)\b/i,
  /\b(?:begins|starts|ends) your\b/i,
  /\b(?:complete|completed|full|unbroken) (?:run|set|series|collection)\b/i,
  /\bcompletes? (?:the|your) (?:run|set|series)\b/i,
];

const checkFiller = (field: string, text: string): string[] => {
  const match = FILLER.map(pattern => text.match(pattern)).find(Boolean);
  return match
    ? [`${field} says "${match[0]}", which only restates the list or overstates it. Say something the collector can't see from their list.`]
    : [];
};

/** Problems with one recommendation; empty means it's grounded in the facts. */
const checkRecommendation = (facts: CollectionFacts, rec: Recommendation, i: number): string[] => {
  const errors: string[] = [];
  const series = findSeries(facts, rec.series);
  if (series) {
    const alreadyOwned = rec.issues.filter(n => series.ownedIssues.includes(n));
    if (alreadyOwned.length) {
      errors.push(
        `recommendations[${i}] suggests ${series.seriesName} #${alreadyOwned.join(', #')}, which the collector already owns.`
      );
    }
  }
  errors.push(...checkText(facts, `recommendations[${i}].reason`, rec.reason, new Set(rec.issues)));
  return errors;
};

/** Returns a list of problems; empty means the analysis is grounded in the facts. */
export const validateAnalysis = (facts: CollectionFacts, analysis: CollectionAnalysis): string[] => {
  const errors: string[] = [];

  errors.push(...checkText(facts, 'summary', analysis.summary), ...checkFiller('summary', analysis.summary));
  analysis.highlights.forEach((h, i) =>
    errors.push(...checkText(facts, `highlights[${i}]`, h), ...checkFiller(`highlights[${i}]`, h))
  );
  errors.push(...checkText(facts, 'observation', analysis.observation), ...checkFiller('observation', analysis.observation));
  analysis.recommendations.forEach((rec, i) => errors.push(...checkRecommendation(facts, rec, i)));

  return errors;
};

/**
 * The parts of an analysis that are grounded in the facts. One wrong number
 * shouldn't cost the collector the whole analysis: a highlight, observation or
 * recommendation that fails the checks is left out, and a summary that fails is
 * replaced with one built from the data. Returns null when nothing from Claude
 * is left worth showing.
 */
export const keepGrounded = (
  facts: CollectionFacts,
  analysis: CollectionAnalysis
): CollectionAnalysis | null => {
  const passes = (field: string, text: string) =>
    checkText(facts, field, text).length === 0 && checkFiller(field, text).length === 0;
  const summaryOk = passes('summary', analysis.summary);
  const highlights = analysis.highlights.filter((h, i) => passes(`highlights[${i}]`, h));
  const recommendations = analysis.recommendations.filter((rec, i) => checkRecommendation(facts, rec, i).length === 0);
  const observation = passes('observation', analysis.observation) ? analysis.observation : '';

  if (!summaryOk && highlights.length === 0 && recommendations.length === 0 && !observation) {
    return null;
  }

  return {
    summary: summaryOk ? analysis.summary : buildFallbackAnalysis(facts).summary,
    highlights,
    recommendations,
    observation,
  };
};

// ---------- Fallback built only from the data ----------

const listIssues = (issues: number[], max = 8) =>
  issues.length <= max
    ? `#${issues.join(', #')}`
    : `#${issues.slice(0, max).join(', #')} and ${issues.length - max} more`;

export const buildFallbackAnalysis = (facts: CollectionFacts): CollectionAnalysis => {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const variantNote = facts.variantCopies
    ? `, plus ${plural(facts.variantCopies, 'variant')}`
    : '';

  return {
    summary: `Your collection has ${plural(facts.uniqueIssues, 'issue')} across ${facts.uniqueSeries} series${variantNote}.`,
    highlights: facts.series.slice(0, 3).map(s =>
      s.pattern === 'run'
        ? `${s.seriesName}: you're collecting a run from #${s.span.first} to #${s.span.last}.`
        : `${s.seriesName}: you've picked standout issues, including ${listIssues(s.ownedIssues, 5)}.`
    ),
    recommendations: facts.series
      .filter(s => s.pattern === 'run' && s.missingIssues.length > 0 && s.missingIssues.length <= 10)
      .slice(0, 4)
      .map(s => ({
        series: s.seriesName,
        issues: s.missingIssues.slice(0, 5),
        reason: 'These fill the gaps in your run.',
      })),
    observation: '',
  };
};

// ---------- Claude call with one corrective retry ----------

/** Busy or briefly unavailable: worth one more try after a short wait */
const statusOf = (error: Error): number | undefined =>
  'status' in error && typeof error.status === 'number' ? error.status : undefined;

const isTemporary = (error: Error): boolean => [429, 500, 502, 503, 529].includes(Number(statusOf(error)));

const requestAnalysis = async (
  client: MessagesClient,
  model: string,
  messages: Anthropic.MessageParam[],
  waitMs = 1500
): Promise<Anthropic.Message> => {
  const ask = () => client.messages.create({
    model,
    max_tokens: 1024,
    // 0 = the same facts get the same answer (consistency over variety)
    temperature: 0,
    system: SYSTEM_PROMPT,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages,
  });

  try {
    return await ask();
  } catch (error) {
    if (!(error instanceof Error) || !isTemporary(error)) throw error;
    console.warn(`Collection analysis: Claude was busy (${statusOf(error)}), trying once more.`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    return ask();
  }
};

export const generateCollectionAnalysis = async (
  facts: CollectionFacts,
  client: MessagesClient,
  { maxAttempts = 2, model = ANALYSIS_MODEL }: { maxAttempts?: number; model?: string } = {}
): Promise<AnalysisResult> => {
  const rejected: string[][] = [];
  /** The most recent well-formed answer, in case every attempt is rejected */
  let lastAnalysis: CollectionAnalysis | undefined;
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Collection facts:\n${JSON.stringify(buildFactsPayload(facts), null, 2)}`,
    },
  ];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: Anthropic.Message;
    try {
      response = await requestAnalysis(client, model, messages);
    } catch (error) {
      console.error('Collection analysis request failed:', error);
      break;
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === TOOL_NAME
    );
    if (!toolUse) {
      rejected.push(['No tool call in response.']);
      continue;
    }

    const { analysis, errors: shapeErrors } = parseAnalysis(toolUse);
    const errors = analysis ? validateAnalysis(facts, analysis) : shapeErrors;
    if (analysis) lastAnalysis = analysis;

    if (analysis && errors.length === 0) {
      return { analysis, source: 'ai', attempts: attempt, rejected };
    }

    rejected.push(errors);
    console.warn(`Collection analysis attempt ${attempt} rejected:`, errors);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          is_error: true,
          content: `Your analysis doesn't match the collection facts. Fix these problems and call ${TOOL_NAME} again:\n- ${errors.join('\n- ')}`,
        },
      ],
    });
  }

  // Every attempt had something wrong: keep the parts that check out
  const grounded = lastAnalysis ? keepGrounded(facts, lastAnalysis) : null;
  if (grounded) {
    console.warn('Collection analysis: showing the parts of the last attempt that match the facts.');
    return { analysis: grounded, source: 'ai', attempts: rejected.length, rejected };
  }

  return {
    analysis: buildFallbackAnalysis(facts),
    source: 'fallback',
    attempts: rejected.length,
    rejected,
  };
};