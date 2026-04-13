import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Pool } from 'pg';

// ============================================================================
// CLIENTS
// ============================================================================

const getAnthropic = () => new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const getOpenAI = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================================
// VECTOR DB CONNECTION
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

// ============================================================================
// INTERFACES
// ============================================================================

export interface AutoEnrichParams {
  comicId: string;
  userId: string;
  title: string;
  comicIssue: string | null;
  volume: string | null;
  year: number | null;
  author: string | null;
  penciler: string | null;
  cbTitle: string;
}

// ============================================================================
// AUTO ENRICH FUNCTION
// ============================================================================

export const autoEnrichComic = async (params: AutoEnrichParams): Promise<void> => {
  const {
    comicId,
    userId,
    title,
    comicIssue,
    volume,
    year,
    author,
    penciler,
    cbTitle
  } = params;

  try {
    console.log(`🤖 Auto-enriching comic: ${cbTitle} #${comicIssue}`);

    // Check if already enriched
    const existing = await getVectorDb().query(`
      SELECT id FROM comic_embeddings
      WHERE comic_id = $1 AND user_id = $2;
    `, [comicId, userId]);

    if (existing.rows.length > 0) {
      console.log(`⏭️ Comic already enriched: ${cbTitle} #${comicIssue}`);
      return;
    }

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
- Issue: #${comicIssue ?? 'Unknown'}
- Volume: ${volume ?? 'Unknown'}
- Year: ${year ?? 'Unknown'}
- Author: ${author ?? 'Unknown'}
- Penciler: ${penciler ?? 'Unknown'}

Write 1-2 sentences describing the tone, themes, era, and what makes this comic notable.
Focus on information that would help someone find this comic through a search like 
"dark 90s Batman" or "classic detective stories".
Return only the description, no additional text.`
      }]
    });

    const description = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Generate embedding with OpenAI
    const embeddingResponse = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: description
    });

    const embedding = embeddingResponse.data[0].embedding;
    const embeddingStr = `[${embedding.join(',')}]`;

    // Store in Stackhero
    await getVectorDb().query(`
      INSERT INTO comic_embeddings
        (comic_id, user_id, title, description, embedding)
      VALUES ($1, $2, $3, $4, $5::vector)
      ON CONFLICT DO NOTHING;
    `, [
      comicId,
      userId,
      `${cbTitle} #${comicIssue}`,
      description,
      embeddingStr
    ]);

    console.log(`✅ Auto-enriched: ${cbTitle} #${comicIssue}`);

  } catch (error) {
    // Log but don't throw — enrichment failure should never block comic creation
    console.error(`❌ Auto-enrich failed for comic ${comicId}:`, error);
  }
};