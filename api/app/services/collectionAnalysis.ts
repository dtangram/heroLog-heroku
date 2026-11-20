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
  messages: { create: (params: any) => Promise<any> };
}

export const ANALYSIS_MODEL = 'claude-haiku-4-5-20251001';
/**
 * Bump when the prompt, tool schema or validation changes, so saved analyses
 * (services/analysisCache.ts) are written again with the new rules.
 */
export const ANALYSIS_VERSION = 1;
const TOOL_NAME = 'record_collection_analysis';
const MAX_SERIES_IN_PROMPT = 10;
const MAX_MISSING_IN_PROMPT = 30;

export const ANALYSIS_TOOL = {
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
} as const;

export const SYSTEM_PROMPT = `You are a comic book collection advisor inside the Hero-Log app. You receive facts computed from the collector's database.

Rules:
- The facts are the only source of truth about what the collector owns. Never say or imply they own an issue that isn't in owned_issues for that series.
- In summary, highlights and observation, only mention issue numbers the collector owns. Put issues they should look for in recommendations.
- Don't restate counts or percentages; the page already shows them. If you reference one, copy it exactly from the facts.
- "scattered" series: the collector picks individual issues instead of completing a run. Don't describe the numbers between them as missing or call the collection incomplete. Recommend standout issues or story arcs instead.
- "run" series: recommend specific issues from missing_issues.
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
    completion_percent: round(s.completionPercentage),
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

const isString = (v: unknown): v is string => typeof v === 'string';

/** Check the tool input matches the schema; returns a cleaned copy or errors. */
export const parseAnalysis = (
  input: any
): { analysis?: CollectionAnalysis; errors: string[] } => {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return { errors: ['Tool input was not an object.'] };

  if (!isString(input.summary) || !input.summary.trim()) errors.push('summary must be a non-empty string.');
  if (!isString(input.observation)) errors.push('observation must be a string.');
  if (!Array.isArray(input.highlights) || !input.highlights.every(isString))
    errors.push('highlights must be an array of strings.');
  if (
    !Array.isArray(input.recommendations) ||
    !input.recommendations.every(
      (r: any) =>
        r &&
        isString(r.series) &&
        isString(r.reason) &&
        Array.isArray(r.issues) &&
        r.issues.every((n: unknown) => Number.isInteger(n))
    )
  )
    errors.push('recommendations must be an array of {series, issues: integer[], reason}.');

  if (errors.length) return { errors };

  return {
    errors,
    analysis: {
      summary: toPlainText(input.summary),
      highlights: input.highlights.slice(0, 3).map(toPlainText).filter(Boolean),
      recommendations: input.recommendations.slice(0, 4).map((r: Recommendation) => ({
        series: toPlainText(r.series),
        issues: Array.from(new Set(r.issues)),
        reason: toPlainText(r.reason),
      })),
      observation: toPlainText(input.observation),
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

/** Returns a list of problems; empty means the analysis is grounded in the facts. */
export const validateAnalysis = (facts: CollectionFacts, analysis: CollectionAnalysis): string[] => {
  const errors: string[] = [];

  errors.push(...checkText(facts, 'summary', analysis.summary));
  analysis.highlights.forEach((h, i) => errors.push(...checkText(facts, `highlights[${i}]`, h)));
  errors.push(...checkText(facts, 'observation', analysis.observation));

  analysis.recommendations.forEach((rec, i) => {
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
  });

  return errors;
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

export const generateCollectionAnalysis = async (
  facts: CollectionFacts,
  client: MessagesClient,
  { maxAttempts = 2, model = ANALYSIS_MODEL }: { maxAttempts?: number; model?: string } = {}
): Promise<AnalysisResult> => {
  const rejected: string[][] = [];
  const messages: any[] = [
    {
      role: 'user',
      content: `Collection facts:\n${JSON.stringify(buildFactsPayload(facts), null, 2)}`,
    },
  ];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: any;
    try {
      response = await client.messages.create({
        model,
        max_tokens: 1024,
        // 0 = the same facts get the same answer (consistency over variety)
        temperature: 0,
        system: SYSTEM_PROMPT,
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: 'tool', name: TOOL_NAME },
        messages,
      });
    } catch (error) {
      console.error('Collection analysis request failed:', error);
      break;
    }

    const toolUse = response?.content?.find(
      (block: any) => block.type === 'tool_use' && block.name === TOOL_NAME
    );
    if (!toolUse) {
      rejected.push(['No tool call in response.']);
      continue;
    }

    const { analysis, errors: shapeErrors } = parseAnalysis(toolUse.input);
    const errors = analysis ? validateAnalysis(facts, analysis) : shapeErrors;

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

  return {
    analysis: buildFallbackAnalysis(facts),
    source: 'fallback',
    attempts: rejected.length,
    rejected,
  };
};