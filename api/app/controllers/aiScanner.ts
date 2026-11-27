import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { z } from 'zod';

type ScanRequest = {
  imageUrl: string;
};

interface ComicMetadata {
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  /** Creator credits printed on the cover; empty string when not shown */
  author: string;
  penciler: string;
  inker: string;
  coverartist: string;
  type: 'regular' | 'variant';
  confidence: number;
}

interface ScanResponse {
  success: boolean;
  data?: ComicMetadata;
  error?: string;
  rawResponse?: string;
}

// ANTHROPIC CLIENT
const getAnthropicClient = (): Anthropic => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  return new Anthropic({ apiKey });
};

// HELPER FUNCTIONS
/** The image formats Claude accepts */
type ImageMediaType = Anthropic.Base64ImageSource['media_type'];

const imageMediaType = (contentType: string): ImageMediaType => {
  if (contentType.includes('png')) return 'image/png';
  if (contentType.includes('gif')) return 'image/gif';
  if (contentType.includes('webp')) return 'image/webp';
  // Default to jpeg for jpg, jpeg, or unknown
  return 'image/jpeg';
};

const downloadImageAsBase64 = async (imageUrl: string): Promise<{ base64: string; mediaType: ImageMediaType }> => {
  console.log('Downloading image:', imageUrl);
  
  try {
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const buffer = Buffer.from(response.data);
    const base64 = buffer.toString('base64');
    
    // Map the content-type header to a format Claude accepts
    const mediaType = imageMediaType(String(response.headers['content-type'] ?? ''));
    
    console.log('Image downloaded, size:', buffer.length, 'bytes, type:', mediaType);
    
    return { base64, mediaType };
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image from URL');
  }
};

/** A field as Claude writes it in its JSON: usually text, sometimes a number */
type CoverField = string | number | null | undefined;

const asText = (value: CoverField): string =>
  value === undefined || value === null ? '' : String(value).trim();

/** The first of two fields that has text; issue 0 counts as text */
const firstText = (value: CoverField, fallback: CoverField): string => asText(value) || asText(fallback);

/** Any field of the wrong kind is read as missing rather than failing the whole scan */
const coverField = z.union([z.string(), z.number()]).nullish().catch(undefined);

/** The JSON Claude returns for a cover; it sometimes uses the app's field names instead */
const coverJsonSchema = z.object({
  title: coverField,
  comicBookTitle: coverField,
  issue: coverField,
  comicIssue: coverField,
  volume: coverField,
  comicBookVolume: coverField,
  year: coverField,
  comicBookYear: coverField,
  publisher: coverField,
  comicBookPublisher: coverField,
  author: coverField,
  writer: coverField,
  penciler: coverField,
  artist: coverField,
  inker: coverField,
  coverartist: coverField,
  coverArtist: coverField,
  type: coverField,
  confidence: z.number().nullish().catch(undefined),
});

/**
 * Normalize a year read from a cover date to 4 digits: "1993" stays,
 * "93" or "'93" becomes "1993", "05" becomes "2005". Anything else is blank.
 */
export const normalizeYear = (value: CoverField): string => {
  const text = asText(value).replace(/^'/, '');
  if (/^\d{4}$/.test(text)) return text;
  if (/^\d{2}$/.test(text)) {
    const twoDigit = Number(text);
    const currentTwoDigit = new Date().getFullYear() % 100;
    return String(twoDigit <= currentTwoDigit + 1 ? 2000 + twoDigit : 1900 + twoDigit);
  }
  return '';
};

export const parseComicMetadata = (text: string): ComicMetadata | null => {
  try {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const result = coverJsonSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (!result.success) return null;
      const parsed = result.data;
      
      // Normalize the data
      return {
        comicBookTitle: firstText(parsed.title, parsed.comicBookTitle),
        comicIssue: firstText(parsed.issue, parsed.comicIssue),
        comicBookVolume: firstText(parsed.volume, parsed.comicBookVolume),
        comicBookYear: normalizeYear(parsed.year || parsed.comicBookYear),
        comicBookPublisher: firstText(parsed.publisher, parsed.comicBookPublisher),
        author: firstText(parsed.author, parsed.writer),
        penciler: firstText(parsed.penciler, parsed.artist),
        inker: asText(parsed.inker),
        coverartist: firstText(parsed.coverartist, parsed.coverArtist),
        type: asText(parsed.type).toLowerCase() === 'variant' ? 'variant' : 'regular',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing comic metadata:', error);
    return null;
  }
};


// CONTROLLER
export const scanComicCover = async (
  req: Request<Record<string, string>, ScanResponse, ScanRequest>,
  res: Response<ScanResponse>
): Promise<Response<ScanResponse>> => {
  const { imageUrl } = req.body;
  
  console.log('Scanning comic cover:', imageUrl);
  
  // Validate input
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Image URL is required'
    });
  }
  
  // Validate URL format
  try {
    new URL(imageUrl);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid image URL format'
    });
  }
  
  try {
    // Download image and convert to base64
    const { base64, mediaType } = await downloadImageAsBase64(imageUrl);
    
    const anthropic = getAnthropicClient();
    
    console.log('Calling Claude Vision API...');
    
    // Call Claude Vision API with base64 image
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64
              }
            },
            {
              type: 'text',
              text: `You are a comic book expert. Analyze this comic book cover image and extract metadata.

**What to look for:**

1. **Title**: The main series name (e.g., "The Amazing Spider-Man", "Batman", "X-Men")
   - Usually the largest text on the cover
   - Don't include "Marvel Comics" or "DC Comics" as part of the title

2. **Issue Number**: Just the number (e.g., "1", "252", "600")
   - Look for "#" symbol followed by a number
   - Common locations: top corner, bottom, or near the title
   - Extract only the number, not the "#" symbol

3. **Volume Number**: Volume/series number if visible (e.g., "Vol. 2", "Volume 3")
   - Often appears near the title
   - Extract only the number
   - Leave empty if not visible

4. **Year**: The publication year, wherever it appears on the cover, including the cover date
   - Often small text near the issue number or price (e.g. "APR 1993", "APR 93", "Oct '87")
   - Always return 4 digits: write two-digit years in full ("93" → "1993", "'05" → "2005")
   - A month alone (e.g. "APR") is not a year: leave it empty
   - If the only year is the one beside the artist's signature (e.g. "Kelley Jones '93"), use it; when a cover date with a year also appears, use the cover date instead
   - Leave empty if no year is printed

5. **Publisher**: The company name (Marvel, DC, Image, Dark Horse, IDW, etc.)
   - Often appears as a logo
   - Common publishers: Marvel Comics, DC Comics, Image Comics, Dark Horse Comics, IDW Publishing, Boom! Studios, Dynamite Entertainment, Valiant Comics

6. **Creators**: Names printed on the cover, usually in a small credit box near a bottom corner or in a strip along the top or bottom
   - If names have labels, use them: "Writer", "Story", "Script" or "Words" → author; "Art", "Artist", "Pencils" or "Penciller" → penciler; "Inks" or "Inker" → inker; "Cover" or "Cover by" → coverartist
   - If names appear stacked or listed without labels (common on DC and Marvel covers from the 1980s and 1990s), read them in order:
     - Two names (e.g. "DOUG MOENCH / JIM APARO"): writer (author), then interior artist (penciler)
     - Three names (e.g. "ALAN GRANT / NORM BREYFOGLE / STEVE MITCHELL"): writer (author), then penciler, then inker
     - Four or more unlabeled names: fill only author and penciler from the first two, because the rest could be colorists, letterers or co-writers
   - With only two names, leave inker empty; the artist may have inked their own pencils, but the cover doesn't say so
   - A credit box names the interior creators, not the cover artist. Fill coverartist from a "Cover by" credit or from the artist's signature on the artwork
   - Cover artists often sign the art by hand, usually near an edge or corner of the illustration and often with a two-digit year (e.g. "Kelley Jones '93" on Batman #496). Look closely for one; it can be small, slanted or stylized
   - Only fill coverartist from a signature you can actually read; if it's illegible, leave coverartist empty rather than guessing who drew it
   - Write names in normal capitalization (e.g. "Doug Moench", not "DOUG MOENCH")
   - Join multiple people in one role with ", "
   - Only use names printed on the cover; never fill a creator from memory

7. **Type**: Is this a regular issue or variant cover?
   - "variant" if you see: variant cover label, special edition text, alternate cover indicator, limited edition notation
   - "regular" for standard issues
   - Default to "regular" if unsure

8. **Confidence**: Your confidence level (0.0 to 1.0)
   - 0.9-1.0: Very clear, all text is readable
   - 0.7-0.8: Most information is visible
   - 0.5-0.6: Some text is unclear or partially visible
   - Below 0.5: Image quality is poor or information is obscured

**Response format - return ONLY valid JSON:**

{
  "title": "series name",
  "issue": "number only",
  "volume": "number or empty string",
  "year": "YYYY or empty string",
  "publisher": "publisher name",
  "author": "writer name or empty string",
  "penciler": "penciler name or empty string",
  "inker": "inker name or empty string",
  "coverartist": "cover artist name or empty string",
  "type": "regular or variant",
  "confidence": 0.85
}

**Important rules:**
- Use empty string "" for fields you cannot identify
- Do not make up information - only extract what you can clearly see
- Return ONLY the JSON object, no additional text
- Ensure the JSON is valid and properly formatted`
            }
          ]
        }
      ]
    });
    
    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    console.log('Claude response:', responseText);
    
    // Parse the metadata
    const metadata = parseComicMetadata(responseText);
    
    if (!metadata) {
      return res.status(200).json({
        success: false,
        error: 'Could not extract comic metadata from cover. The image may be unclear or not a comic book cover.',
        rawResponse: responseText
      });
    }
    
    // Check if we got any useful data
    if (!metadata.comicBookTitle && !metadata.comicIssue && !metadata.comicBookPublisher) {
      return res.status(200).json({
        success: false,
        error: 'Could not identify any comic book information from this image.',
        rawResponse: responseText
      });
    }
    
    console.log('Extracted metadata:', metadata);
    
    return res.status(200).json({
      success: true,
      data: metadata
    });
    
  } catch (error) {
    console.error('Error scanning comic cover:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        error: `Failed to scan cover: ${error.message}`
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while scanning the cover'
    });
  }
};