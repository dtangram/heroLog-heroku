/// <reference types="jest" />
import { buildCollectionFacts } from '../collectionFacts';
import { generateCollectionAnalysis, keepGrounded, validateAnalysis } from '../collectionAnalysis';

// A collection like the one on the live site
const issues = (title: string, numbers: number[]) =>
  numbers.map(n => ({ title, comicIssue: String(n), type: 'regular' }));

const facts = buildCollectionFacts([
  ...issues('Batman', [423, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 541, 659, 660]),
  ...issues('Amazing Spider-Man', [394, 395, 396]),
  ...issues('Superman', [25, 75]),
]);

// The kind of answer that used to be thrown away: mostly right, one sentence wrong
const mostlyRight = {
  summary: 'You have built a focused collection anchored by the Knightfall era.',
  highlights: [
    'Batman #497 is the issue where Bane breaks Batman.',
    'Your 37 issues of Knightfall tell the whole story.', // a count the facts don't support
  ],
  recommendations: [
    { series: 'Batman', issues: [502, 503], reason: 'These continue straight on from #501.' },
    { series: 'Batman', issues: [497], reason: 'A key issue.' }, // already owned
  ],
  observation: 'Superman #75 is one of the best-known issues of the 1990s.',
};

const replyWith = (input: object) => ({
  content: [{ type: 'tool_use', id: 'tool-1', name: 'record_collection_analysis', input }],
});

describe('keepGrounded', () => {
  it('keeps the parts that match the collection and drops the ones that do not', () => {
    const kept = keepGrounded(facts, mostlyRight)!;

    expect(kept.summary).toBe(mostlyRight.summary);
    expect(kept.highlights).toEqual(['Batman #497 is the issue where Bane breaks Batman.']);
    expect(kept.recommendations.map(r => r.issues)).toEqual([[502, 503]]);
    expect(kept.observation).toBe(mostlyRight.observation);
  });

  it('replaces a wrong summary with one built from the data', () => {
    const kept = keepGrounded(facts, { ...mostlyRight, summary: 'You own Batman #1.' })!;

    expect(kept.summary).toMatch(/^Your collection has 20 issues across 3 series/);
  });

  it('gives up when nothing checks out', () => {
    expect(keepGrounded(facts, {
      summary: 'You own Batman #1.',
      highlights: ['You own Batman #2.'],
      recommendations: [],
      observation: 'You own Batman #3.',
    })).toBeNull();
  });
});

describe('generateCollectionAnalysis', () => {
  it('shows the AI analysis without the wrong sentence when every attempt has one', async () => {
    const client = { messages: { create: jest.fn().mockResolvedValue(replyWith(mostlyRight)) } };

    const result = await generateCollectionAnalysis(facts, client);

    expect(result.source).toBe('ai');
    expect(result.analysis.highlights).toHaveLength(1);
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });

  it('tries once more when Claude is busy', async () => {
    const busy = Object.assign(new Error('Overloaded'), { status: 529 });
    const create = jest.fn()
      .mockRejectedValueOnce(busy)
      .mockResolvedValue(replyWith({ ...mostlyRight, highlights: [mostlyRight.highlights[0]], recommendations: [mostlyRight.recommendations[0]] }));

    const result = await generateCollectionAnalysis(facts, { messages: { create } });

    expect(result.source).toBe('ai');
    expect(result.attempts).toBe(1);
  });

  it('uses the summary from the data when Claude cannot be reached', async () => {
    const create = jest.fn().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));

    const result = await generateCollectionAnalysis(facts, { messages: { create } });

    expect(result.source).toBe('fallback');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
describe('filler and overclaims', () => {
  const facts = buildCollectionFacts([
    { title: 'Detective Comics', comicIssue: '659', type: 'regular' },
    { title: 'Detective Comics', comicIssue: '660', type: 'regular' },
  ]);

  const analysis = {
    summary: 'You own a complete run of Detective Comics.',
    highlights: ['Issue 660 continues the sequence.', 'Detective Comics #659 is part of the Knightfall saga.'],
    recommendations: [],
    observation: 'Issue 659 marks the beginning of your Detective Comics run.',
  };

  it('flags lines that only restate the list or call a short span a complete run', () => {
    const errors = validateAnalysis(facts, analysis);
    expect(errors.some(e => e.startsWith('summary says "complete run"'))).toBe(true);
    expect(errors.some(e => e.startsWith('highlights[0] says "continues the sequence"'))).toBe(true);
    expect(errors.some(e => e.startsWith('observation says "marks the beginning of your"'))).toBe(true);
  });

  it('keeps only the useful lines', () => {
    const kept = keepGrounded(facts, analysis);
    expect(kept?.highlights).toEqual(['Detective Comics #659 is part of the Knightfall saga.']);
    expect(kept?.observation).toBe('');
    expect(kept?.summary).not.toMatch(/complete run/);
  });
});