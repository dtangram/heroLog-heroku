import express, { Request, Response, NextFunction } from 'express';
import { requireIdentity, AuthRequest } from '../middleware/auth';
import { ownsParam } from '../middleware/ownership';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Pool } from 'pg';

const router = express.Router();

// Every search needs a session (signed in or guest). Searching a collection,
// or preparing it for search, is limited to its owner.
router.use(requireIdentity);

/** An enrichment job (by :jobId) must belong to the requester */
const ownsJob = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getVectorDb().query('SELECT user_id FROM enrichment_jobs WHERE id = $1;', [req.params.jobId]);
    if (String(result.rows[0]?.user_id ?? '').toLowerCase() !== String(req.user?.id ?? '').toLowerCase()) {
      res.status(404).json({ status: 'Failed', error: 'Job not found' });
      return;
    }
    next();
  } catch {
    res.status(404).json({ status: 'Failed', error: 'Job not found' });
  }
};

// ============================================================================
// DATABASE CONNECTIONS
// ============================================================================

let vectorDbPool: Pool | null = null;

const getVectorDb = (): Pool => {
  if (!vectorDbPool) {
    vectorDbPool = new Pool({
      host: process.env.STACKHERO_POSTGRESQL_HOST,
      port: Number(process.env.STACKHERO_POSTGRESQL_PORT),
      user: 'admin',
      password: process.env.STACKHERO_POSTGRESQL_ADMIN_PASSWORD,
      database: 'admin',
      ssl: { rejectUnauthorized: false }
    });
  }
  return vectorDbPool;
};

let herokuDbPool: Pool | null = null;

const getHerokuDb = (): Pool => {
  if (!herokuDbPool) {
    herokuDbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return herokuDbPool;
};

// ============================================================================
// AI CLIENTS
// ============================================================================

const getAnthropic = () => new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const getOpenAI = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================================
// HELPERS
// ============================================================================

const generateEmbedding = async (text: string): Promise<number[]> => {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
};

// ============================================================================
// SEARCH SETTINGS
// ============================================================================

/** All Comics and Find Missing: Haiku is far cheaper than Opus and quick enough for a list of comics */
export const SEARCH_MODEL = 'claude-haiku-5-5';

/**
 * All Comics: most comics to show. A storyline (Knightfall, say) can run to
 * dozens of issues across several series.
 */
export const SEARCH_RESULT_COUNT = 40;

/** Room for 40 short results, plus any thinking the model does first */
const SEARCH_MAX_TOKENS = 8000;

/**
 * Find Missing: most comics to suggest. Higher than All Comics because a
 * storyline (Knightfall, say) can run to dozens of issues across several series.
 */
export const MISSING_RESULT_COUNT = 40;

/** Room for 40 short results, plus any thinking the model does first */
const MISSING_MAX_TOKENS = 8000;

/** The most owned comics listed in the Find Missing request (about 12,000 tokens; well under a cent on Haiku) */
const MISSING_OWNED_LIMIT = 3000;

/** My Collection: most matches to show */
export const COLLECTION_RESULT_LIMIT = 20;

/**
 * My Collection: weakest match to show (0–1, shown on the page as "% match").
 * Below this the comic has little to do with what was typed. Raise it for
 * fewer, closer matches; lower it to see more.
 */
export const COLLECTION_MIN_SIMILARITY = 0.25;

/**
 * My Collection: how far below the best match a comic can score and still be
 * shown. For "Knightfall saga" the Knightfall issues scored 36–47% and
 * unrelated Batman issues 25–32%, so a fixed floor alone let the unrelated
 * ones in. Keeping only what's close to the best match works whether a
 * search's scores run high or low. Lower it for fewer, closer matches.
 */
export const COLLECTION_MAX_GAP = 0.12;

/** The matches close enough to the best one (rows arrive best first) */
export const closeMatches = <T extends { similarity_score: number }>(rows: T[]): T[] => {
  if (rows.length === 0) return rows;
  const best = rows[0].similarity_score;
  return rows.filter(row => row.similarity_score >= best - COLLECTION_MAX_GAP);
};

/**
 * All the text in Claude's reply. Newer models can start a reply with a
 * thinking block, so the text isn't always the first block.
 */
export const replyText = (content: Array<{ type: string; text?: string }>): string =>
  content
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('');

/**
 * The comics in Claude's reply. Takes the list from between the first [ and
 * the last ], so a sentence or a code fence around it doesn't matter.
 */
export const parseComicList = (text: string): any[] => {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end < start) {
    throw new Error(`No comic list in Claude's reply: ${text.slice(0, 200)}`);
  }
  const list = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(list)) {
    throw new Error('Claude\'s reply was not a list of comics');
  }
  return list.filter(item => item && typeof item.title === 'string');
};

/**
 * A comic's title in one form, so "Batman #0491" and "batman  #491" are the
 * same comic. Exact comparison only: "Batman #49" is not "Batman #491".
 */
export const normalizeTitle = (title: string): string =>
  String(title)
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/#\s*0*(\d)/g, '#$1')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The owned comics, grouped by series to keep the request short:
 * "Batman: #491, #492, #497".
 */
export const summarizeOwned = (titles: string[]): string => {
  const series = new Map<string, string[]>();
  for (const title of titles) {
    const at = title.lastIndexOf(' #');
    const name = at === -1 ? title : title.slice(0, at);
    const issue = at === -1 ? '' : title.slice(at + 1);
    if (!series.has(name)) series.set(name, []);
    if (issue) series.get(name)!.push(issue);
  }
  return [...series.entries()]
    .map(([name, issues]) => (issues.length ? `${name}: ${issues.join(', ')}` : name))
    .join('\n');
};

/** Ask Claude for comics, and log why if none come back */
const askClaudeForComics = async (q: string, prompt = comicPrompt(q), maxTokens = SEARCH_MAX_TOKENS): Promise<any[]> => {
  const message = await getAnthropic().messages.create({
    model: SEARCH_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = replyText(message.content);
  const comics = parseComicList(text);

  if (comics.length === 0) {
    console.warn(
      `⚠️ Claude returned no comics for "${q}" (stop: ${message.stop_reason}, blocks: ${message.content.map(b => b.type).join(', ')})`
    );
  }
  return comics;
};

const comicPrompt = (q: string): string => `
You are a comic book expert. A user is searching for: "${q}"

Return ONLY a JSON array with no other text, no markdown, no backticks, no explanation.
Just the raw JSON array starting with [ and ending with ]

If the search names a storyline, event or run, list every issue in it, including tie-ins in other series,
in publication order. Otherwise list the best matches first. Aim for ${SEARCH_RESULT_COUNT} comics;
return fewer only if fewer comics genuinely match.

Each item must have exactly these fields:
- title: series name and issue number, written like "Batman #497"
- description: one short sentence about tone and themes only
- publisher: publisher name
- year: publication year as a string

Example of exact format to return:
[{"title": "Batman #497", "description": "A dark psychological thriller.", "publisher": "DC Comics", "year": "1993"}]`;

/**
 * Find Missing: Claude is told what the collector owns, so every suggestion
 * is one they're missing. Asking for the whole storyline in publication order
 * gives much the same list each time, instead of a different handful.
 */
const missingPrompt = (q: string, owned: string): string => `
You are a comic book expert. A collector is searching for: "${q}"

These are the comics they already own:
${owned || '(none yet)'}

List the comics that match the search which they do NOT own. If the search names a storyline, event or run,
list every issue in it that they are missing, including tie-ins in other series, in publication order.
Otherwise list the best matches first. Never include a comic from the owned list above.

Return ONLY a JSON array with no other text, no markdown, no backticks, no explanation.
Just the raw JSON array starting with [ and ending with ]

Each item must have exactly these fields:
- title: series name and issue number, written like "Batman #497"
- description: one short sentence about tone and themes only
- publisher: publisher name
- year: publication year as a string

Aim for ${MISSING_RESULT_COUNT} comics; return fewer only if fewer that they're missing genuinely match. Example of exact format to return:
[{"title": "Detective Comics #659", "description": "A gritty street-level tie-in.", "publisher": "DC Comics", "year": "1993"}]`;

// ============================================================================
// BACKGROUND ENRICHMENT PROCESSOR
// ============================================================================

/**
 * OpenAI refuses with 429 when the account is out of credits
 * ("insufficient_quota") or busy. Retrying the rest of a batch then only
 * fails again, so a job stops and the next visit to Search starts over.
 */
export const isOpenAIUnavailable = (error: unknown): boolean => {
  const e = error as { status?: number; code?: string; error?: { type?: string } } | undefined;
  return e?.status === 429 || e?.code === 'insufficient_quota' || e?.error?.type === 'insufficient_quota';
};

/**
 * Which of the owner's comics have no search data yet. Also removes search
 * data for comics that no longer exist, so deleted comics stop turning up in
 * My Collection results.
 */
export const findComicsMissingSearchData = async (
  userId: string
): Promise<{ total: number; missingIds: string[] }> => {
  const owned = await getHerokuDb().query(`
    SELECT cb.id::text AS id, cbt."cbTitle", cb."comicIssue"
    FROM "ComicBooks" cb
    JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
    JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
    WHERE cp."collectpubUsersId" = $1;
  `, [userId]);
  const ownedIds = owned.rows.map((row: { id: string }) => row.id);
  // Written exactly as the search data writes it
  const currentTitle = new Map<string, string>(
    owned.rows.map((row: { id: string; cbTitle: string; comicIssue: unknown }) =>
      [row.id, normalizeTitle(`${row.cbTitle} #${row.comicIssue}`)])
  );

  const prepared = await getVectorDb().query(
    'SELECT comic_id, title, embedding IS NULL AS unfinished FROM comic_embeddings WHERE user_id = $1;',
    [userId]
  );

  // Search data is out of date when the comic was edited after it was prepared
  // (a corrected issue number, say), or unfinished when it has no embedding.
  // Either way the comic can't be found, so it's prepared again.
  const preparedIds = new Set<string>();
  const staleIds: string[] = [];
  for (const row of prepared.rows as Array<{ comic_id: string; title: string; unfinished: boolean }>) {
    const id = String(row.comic_id);
    const title = currentTitle.get(id);
    if (title === undefined || row.unfinished || normalizeTitle(row.title) !== title) {
      staleIds.push(id);
    } else {
      preparedIds.add(id);
    }
  }
  if (staleIds.length > 0) {
    await getVectorDb().query(
      'DELETE FROM comic_embeddings WHERE user_id = $1 AND comic_id = ANY($2::text[]);',
      [userId, staleIds]
    );
  }

  return { total: ownedIds.length, missingIds: ownedIds.filter(id => !preparedIds.has(id)) };
};

const BATCH_SIZE = 10;

/**
 * Prepares the given comics for My Collection search: Claude writes a
 * description, OpenAI turns it into an embedding. Works through the list by
 * ID (the old offset-based loop skipped every other batch), and stops early if
 * OpenAI is unavailable instead of failing every remaining comic.
 */
const processEnrichmentJob = async (userId: string, jobId: number, comicIds: string[]): Promise<void> => {
  const setStatus = (status: 'completed' | 'failed') =>
    getVectorDb().query(
      `UPDATE enrichment_jobs SET status = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [jobId, status]
    );

  try {
    for (let start = 0; start < comicIds.length; start += BATCH_SIZE) {
      const jobCheck = await getVectorDb().query('SELECT status FROM enrichment_jobs WHERE id = $1;', [jobId]);
      if (jobCheck.rows[0]?.status === 'cancelled') {
        console.log(`🛑 Job ${jobId} cancelled`);
        return;
      }

      const comicsResult = await getHerokuDb().query(`
        SELECT 
          cb.id,
          cb.title,
          cb.author,
          cb.penciler,
          cb.year,
          cb."comicIssue",
          cb.volume,
          cbt."cbTitle"
        FROM "ComicBooks" cb
        JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
        JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
        WHERE cp."collectpubUsersId" = $1 AND cb.id::text = ANY($2::text[]);
      `, [userId, comicIds.slice(start, start + BATCH_SIZE)]);

      for (const comic of comicsResult.rows) {
        const { id, title, author, penciler, year, comicIssue, volume, cbTitle } = comic;

        try {
          // Generate description with Claude
          const message = await getAnthropic().messages.create({
            model: 'claude-opus-4-5',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: `Generate a rich, detailed description for this comic book that captures its themes, tone, era, and significance.

Comic Details:
- Series: ${cbTitle}
- Title: ${title}
- Issue: #${comicIssue}
- Volume: ${volume}
- Year: ${year ?? 'Unknown'}
- Author: ${author ?? 'Unknown'}
- Penciler: ${penciler ?? 'Unknown'}

Write 2-3 sentences describing the tone, themes, era, and what makes this comic notable.
Focus on information that would help someone find this comic through a search like 
"dark 90s Batman" or "classic detective stories".
Return only the description, no additional text.`
            }]
          });

          // An empty description can't be embedded, so fall back to the comic's details
          const description = replyText(message.content).trim() ||
            [`${cbTitle} #${comicIssue}`, title, year, author, penciler].filter(Boolean).join(', ');

          // Generate embedding
          const embedding = await generateEmbedding(description);
          const embeddingStr = `[${embedding.join(',')}]`;

          // Store in Stackhero
          await getVectorDb().query(`
            INSERT INTO comic_embeddings 
              (comic_id, user_id, title, description, embedding)
            VALUES ($1, $2, $3, $4, $5::vector)
            ON CONFLICT DO NOTHING;
          `, [
            String(id),
            userId,
            `${cbTitle} #${comicIssue}`,
            description,
            embeddingStr
          ]);

          await getVectorDb().query(
            'UPDATE enrichment_jobs SET processed_comics = processed_comics + 1 WHERE id = $1;',
            [jobId]
          );

          console.log(`✅ Enriched: ${cbTitle} #${comicIssue}`);
        } catch (comicError) {
          if (isOpenAIUnavailable(comicError)) {
            console.error(`🛑 Job ${jobId} stopped: OpenAI is unavailable (out of credits or rate limited)`);
            await setStatus('failed');
            return;
          }
          console.error(`❌ Failed to enrich comic ${id}:`, comicError);
        }
      }
    }

    await setStatus('completed');
    console.log(`✅ Job ${jobId} completed`);
  } catch (error) {
    await setStatus('failed');
    console.error(`❌ Job ${jobId} failed:`, error);
  }
};

// ============================================================================
// ROUTES
// ============================================================================

// Enrich and store comics with Claude descriptions (legacy — limit 10)
router.get('/enrich-and-store/:userId', ownsParam('userId'), async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const comicsResult = await getHerokuDb().query(`
      SELECT 
        cb.id,
        cb.title,
        cb.author,
        cb.penciler,
        cb.year,
        cb."comicIssue",
        cb.volume,
        cbt."cbTitle"
      FROM "ComicBooks" cb
      JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
      JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
      WHERE cp."collectpubUsersId" = $1
      LIMIT 10;
    `, [userId]);

    const stored: any[] = [];

    for (const comic of comicsResult.rows) {
      const { id, title, author, penciler, year, comicIssue, volume, cbTitle } = comic;

      const message = await getAnthropic().messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Generate a rich, detailed description for this comic book that captures its themes, tone, era, and significance.

Comic Details:
- Series: ${cbTitle}
- Title: ${title}
- Issue: #${comicIssue}
- Volume: ${volume}
- Year: ${year ?? 'Unknown'}
- Author: ${author ?? 'Unknown'}
- Penciler: ${penciler ?? 'Unknown'}

Write 2-3 sentences describing the tone, themes, era, and what makes this comic notable.
Focus on information that would help someone find this comic through a search like 
"dark 90s Batman" or "classic detective stories".
Return only the description, no additional text.`
        }]
      });

      const description = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      await getVectorDb().query(`
        INSERT INTO comic_embeddings (comic_id, user_id, title, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING;
      `, [String(id), userId, `${cbTitle} #${comicIssue}`, description]);

      stored.push({ comic_id: String(id), title: `${cbTitle} #${comicIssue}`, description });
    }

    res.json({ status: 'Success', stored_count: stored.length, comics: stored });

  } catch (error) {
    console.error('❌ Enrich and store error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Generate embeddings for stored comics
router.get('/generate-embeddings/:userId', ownsParam('userId'), async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const result = await getVectorDb().query(`
      SELECT id, title, description
      FROM comic_embeddings
      WHERE user_id = $1
      AND embedding IS NULL;
    `, [userId]);

    let updatedCount = 0;

    for (const comic of result.rows) {
      const embedding = await generateEmbedding(comic.description);
      const embeddingStr = `[${embedding.join(',')}]`;

      await getVectorDb().query(`
        UPDATE comic_embeddings
        SET embedding = $1::vector
        WHERE id = $2;
      `, [embeddingStr, comic.id]);

      updatedCount++;
    }

    res.json({ status: 'Success', embeddings_generated: updatedCount });

  } catch (error) {
    console.error('❌ Generate embeddings error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Semantic search within user's collection
router.get('/search/:userId', ownsParam('userId'), async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { q } = req.query as { q: string };

  try {
    const queryEmbedding = await generateEmbedding(q);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const result = await getVectorDb().query(`
      SELECT 
        comic_id,
        title,
        description,
        1 - (embedding <=> $1::vector) as similarity
      FROM comic_embeddings
      WHERE user_id = $2
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) >= $3
      ORDER BY embedding <=> $1::vector
      LIMIT $4;
    `, [embeddingStr, userId, COLLECTION_MIN_SIMILARITY, COLLECTION_RESULT_LIMIT]);

    const results = closeMatches(result.rows.map(row => ({
      comic_id: row.comic_id,
      title: row.title,
      description: row.description,
      similarity_score: parseFloat(parseFloat(row.similarity).toFixed(4))
    })));

    res.json({ status: 'Success', query: q, results });

  } catch (error) {
    console.error('❌ Search error:', error);
    if (isOpenAIUnavailable(error)) {
      // Out of OpenAI credits or rate limited: not the visitor's fault, and temporary
      res.status(503).json({ status: 'Unavailable', error: 'Collection search is temporarily unavailable' });
      return;
    }
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Search all comics using Claude knowledge
router.get('/search-all', async (req: Request, res: Response) => {
  const { q } = req.query as { q: string };

  try {
    const results = (await askClaudeForComics(q)).map(result => ({
      ...result,
      source: 'claude'
    }));

    res.json({ status: 'Success', query: q, results });

  } catch (error) {
    console.error('❌ Search all error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Find comics user doesn't own
router.get('/search-missing/:userId', ownsParam('userId'), async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { q } = req.query as { q: string };

  try {
    // From the collection itself, so a comic counts as owned even before it's
    // ready for My Collection search
    const ownedResult = await getHerokuDb().query(`
      SELECT DISTINCT cbt."cbTitle", cb."comicIssue"
      FROM "ComicBooks" cb
      JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
      JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
      WHERE cp."collectpubUsersId" = $1
      ORDER BY cbt."cbTitle", cb."comicIssue"
      LIMIT $2;
    `, [userId, MISSING_OWNED_LIMIT]);

    const ownedTitles: string[] = ownedResult.rows.map((row: any) =>
      row.comicIssue == null || row.comicIssue === '' ? String(row.cbTitle) : `${row.cbTitle} #${row.comicIssue}`);
    const owned = new Set(ownedTitles.map(normalizeTitle));

    const suggestions = await askClaudeForComics(q, missingPrompt(q, summarizeOwned(ownedTitles)), MISSING_MAX_TOKENS);

    // Only comics they don't own, each once (Claude can slip an owned one in)
    const seen = new Set<string>();
    const results = suggestions
      .filter(result => {
        const key = normalizeTitle(result.title);
        if (owned.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(result => ({ ...result, already_owned: false, source: 'claude' }));

    res.json({ status: 'Success', query: q, results });

  } catch (error) {
    console.error('❌ Search missing error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Start enrichment job
/** A job started this recently and still "running" is assumed to be alive */
const RUNNING_JOB_WINDOW_MINUTES = 30;

// Prepare any of the owner's comics that are missing search data.
// The Search page calls this on every visit, so it's cheap when nothing is
// missing and never starts a second job while one is running.
router.post('/enrich-all/:userId', ownsParam('userId'), async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { total, missingIds } = await findComicsMissingSearchData(userId);

    if (total === 0) {
      res.json({ status: 'Empty', message: 'No comics found in your collection. Add some comics first!' });
      return;
    }

    if (missingIds.length === 0) {
      res.json({ status: 'Complete', message: 'Collection already fully enriched' });
      return;
    }

    const running = await getVectorDb().query(`
      SELECT id, total_comics FROM enrichment_jobs
      WHERE user_id = $1 AND status = 'running'
        AND started_at > NOW() - ($2 || ' minutes')::interval
      ORDER BY started_at DESC
      LIMIT 1;
    `, [userId, String(RUNNING_JOB_WINDOW_MINUTES)]);

    if (running.rows.length > 0) {
      res.json({
        status: 'Running',
        message: 'Enrichment job already running',
        job_id: running.rows[0].id,
        total_comics: running.rows[0].total_comics
      });
      return;
    }

    const jobResult = await getVectorDb().query(`
      INSERT INTO enrichment_jobs (user_id, total_comics, status)
      VALUES ($1, $2, 'running')
      RETURNING id;
    `, [userId, missingIds.length]);

    const jobId = jobResult.rows[0].id;

    processEnrichmentJob(userId, jobId, missingIds).catch(err => {
      console.error('❌ Enrichment job failed:', err);
    });

    res.json({
      status: 'Success',
      message: 'Enrichment job started',
      job_id: jobId,
      total_comics: missingIds.length
    });

  } catch (error) {
    console.error('❌ Start enrichment error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Check enrichment job progress
router.get('/enrich-progress/:jobId', ownsJob, async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;

  try {
    const result = await getVectorDb().query(`
      SELECT 
        id,
        user_id,
        total_comics,
        processed_comics,
        status,
        started_at,
        completed_at
      FROM enrichment_jobs
      WHERE id = $1;
    `, [jobId]);

    if (result.rows.length === 0) {
      res.status(404).json({ status: 'Failed', error: 'Job not found' });
      return;
    }

    const job = result.rows[0];
    const percentage = job.total_comics > 0
      ? Math.round((job.processed_comics / job.total_comics) * 100)
      : 0;

    res.json({
      status: 'Success',
      job: {
        id: job.id,
        total_comics: job.total_comics,
        processed_comics: job.processed_comics,
        percentage,
        status: job.status,
        started_at: job.started_at,
        completed_at: job.completed_at
      }
    });

  } catch (error) {
    console.error('❌ Progress check error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Cancel enrichment job
router.post('/enrich-cancel/:jobId', ownsJob, async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    await getVectorDb().query(`
      UPDATE enrichment_jobs
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [jobId]);

    res.json({ status: 'Success', message: 'Job cancelled' });

  } catch (error) {
    console.error('❌ Cancel job error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

/**
 * Moves search data from one owner to another, when a guest's collection
 * becomes their account's (services/guestSession.ts).
 */
export const moveSearchData = async (fromId: string, toId: string): Promise<void> => {
  await getVectorDb().query('UPDATE comic_embeddings SET user_id = $1 WHERE user_id = $2;', [toId, fromId]);
};

/**
 * Forgets one comic's search data after it's edited, so the next visit to
 * Search prepares it again with the new details.
 */
export const clearComicSearchData = async (comicId: string): Promise<void> => {
  await getVectorDb().query('DELETE FROM comic_embeddings WHERE comic_id = $1;', [String(comicId)]);
};

/** Removes an owner's search data when their account is deleted. */
export const deleteSearchData = async (ownerId: string): Promise<void> => {
  await getVectorDb().query('DELETE FROM comic_embeddings WHERE user_id = $1;', [ownerId]);
};

export default router;