import express, { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Pool } from 'pg';

const router = express.Router();

// ============================================================================
// DATABASE CONNECTIONS
// ============================================================================

// Stackhero vector database connection
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

const vectorDb = getVectorDb();

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

const parseClaudeJSON = (text: string): any[] => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.split('```')[1];
    if (cleaned.startsWith('json')) {
      cleaned = cleaned.slice(4);
    }
    cleaned = cleaned.trim();
  }
  return JSON.parse(cleaned);
};

const comicPrompt = (q: string): string => `
You are a comic book expert. A user is searching for: "${q}"

Return ONLY a JSON array with no other text, no markdown, no backticks, no explanation.
Just the raw JSON array starting with [ and ending with ]

Each item must have exactly these fields:
- title: series name and issue number
- description: 2-3 sentences about tone, themes, era and significance
- publisher: publisher name
- year: publication year as a string

Example of exact format to return:
[{"title": "Batman #497", "description": "A dark psychological thriller.", "publisher": "DC Comics", "year": "1993"}]`;

const processEnrichmentJob = async (userId: string, jobId: number): Promise<void> => {
  const BATCH_SIZE = 10;
  let offset = 0;

  try {
    while (true) {
      // Check if job was cancelled
      const jobCheck = await vectorDb.query(`
        SELECT status FROM enrichment_jobs WHERE id = $1;
      `, [jobId]);

      if (jobCheck.rows[0]?.status === 'cancelled') {
        console.log(`🛑 Job ${jobId} cancelled`);
        break;
      }

      // Fetch next batch of comics not yet enriched
      const comicsResult = await vectorDb.query(`
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
        JOIN "Users" u ON cp."collectpubUsersId" = u.id
        WHERE u.id = $1
        AND cb.id::text NOT IN (
          SELECT comic_id FROM comic_embeddings WHERE user_id = $1
        )
        LIMIT $2 OFFSET $3;
      `, [userId, BATCH_SIZE, offset]);

      // No more comics to process
      if (comicsResult.rows.length === 0) {
        await vectorDb.query(`
          UPDATE enrichment_jobs
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [jobId]);
        console.log(`✅ Job ${jobId} completed`);
        break;
      }

      // Process each comic in batch
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

          const description = message.content[0].type === 'text'
            ? message.content[0].text
            : '';

          // Generate embedding
          const embedding = await generateEmbedding(description);
          const embeddingStr = `[${embedding.join(',')}]`;

          // Store description and embedding together
          await vectorDb.query(`
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

          // Update progress
          await vectorDb.query(`
            UPDATE enrichment_jobs
            SET processed_comics = processed_comics + 1
            WHERE id = $1;
          `, [jobId]);

          console.log(`✅ Enriched: ${cbTitle} #${comicIssue}`);

        } catch (comicError) {
          console.error(`❌ Failed to enrich comic ${id}:`, comicError);
          // Continue processing remaining comics
        }
      }

      offset += BATCH_SIZE;
    }

  } catch (error) {
    // Mark job as failed
    await vectorDb.query(`
      UPDATE enrichment_jobs
      SET status = 'failed', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [jobId]);
    console.error(`❌ Job ${jobId} failed:`, error);
  }
};

// ============================================================================
// ROUTES
// ============================================================================

// Enrich and store comics with Claude descriptions
router.get('/enrich-and-store/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Fetch user's comics from Heroku database
    const comicsResult = await vectorDb.query(`
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
      JOIN "Users" u ON cp."collectpubUsersId" = u.id
      WHERE u.id = $1
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

      await vectorDb.query(`
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
router.get('/generate-embeddings/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const result = await vectorDb.query(`
      SELECT id, title, description
      FROM comic_embeddings
      WHERE user_id = $1
      AND embedding IS NULL;
    `, [userId]);

    let updatedCount = 0;

    for (const comic of result.rows) {
      const embedding = await generateEmbedding(comic.description);
      const embeddingStr = `[${embedding.join(',')}]`;

      await vectorDb.query(`
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
router.get('/search/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { q } = req.query as { q: string };

  try {
    const queryEmbedding = await generateEmbedding(q);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const result = await vectorDb.query(`
      SELECT 
        comic_id,
        title,
        description,
        1 - (embedding <=> $1::vector) as similarity
      FROM comic_embeddings
      WHERE user_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT 5;
    `, [embeddingStr, userId]);

    const results = result.rows.map(row => ({
      comic_id: row.comic_id,
      title: row.title,
      description: row.description,
      similarity_score: parseFloat(parseFloat(row.similarity).toFixed(4))
    }));

    res.json({ status: 'Success', query: q, results });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

// Search all comics using Claude knowledge
router.get('/search-all', async (req: Request, res: Response) => {
  const { q } = req.query as { q: string };

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: comicPrompt(q) }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const results = parseClaudeJSON(text).map(result => ({
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
router.get('/search-missing/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { q } = req.query as { q: string };

  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: comicPrompt(q) }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const allResults = parseClaudeJSON(text);

    // Get user's owned titles from vector db
    const ownedResult = await vectorDb.query(`
      SELECT LOWER(title) FROM comic_embeddings
      WHERE user_id = $1;
    `, [userId]);

    const ownedTitles = ownedResult.rows.map((row: any) => row.lower);

    const results = allResults.map(result => {
      const titleLower = result.title.toLowerCase();
      const alreadyOwned = ownedTitles.some(
        (owned: string) => owned.includes(titleLower) || titleLower.includes(owned)
      );
      return { ...result, already_owned: alreadyOwned, source: 'claude' };
    });

    res.json({ status: 'Success', query: q, results });

  } catch (error) {
    console.error('❌ Search missing error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

router.post('/enrich-all/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Get total comic count for this user
    const countResult = await vectorDb.query(`
      SELECT COUNT(*) as total
      FROM "ComicBooks" cb
      JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
      JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
      JOIN "Users" u ON cp."collectpubUsersId" = u.id
      WHERE u.id = $1;
    `, [userId]);

    const totalComics = parseInt(countResult.rows[0].total);

    // Create enrichment job
    const jobResult = await vectorDb.query(`
      INSERT INTO enrichment_jobs (user_id, total_comics, status)
      VALUES ($1, $2, 'running')
      RETURNING id;
    `, [userId, totalComics]);

    const jobId = jobResult.rows[0].id;

    // Process in background without awaiting
    processEnrichmentJob(userId, jobId).catch(err => {
      console.error('❌ Enrichment job failed:', err);
    });

    res.json({
      status: 'Success',
      message: 'Enrichment job started',
      job_id: jobId,
      total_comics: totalComics
    });

  } catch (error) {
    console.error('❌ Start enrichment error:', error);
    res.status(500).json({ status: 'Failed', error: String(error) });
  }
});

router.get('/enrich-progress/:jobId', async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;

  try {
    const result = await vectorDb.query(`
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

router.post('/enrich-cancel/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    await vectorDb.query(`
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

export default router;