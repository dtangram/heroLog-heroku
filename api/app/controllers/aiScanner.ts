import { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ScanRequest {
  imageUrl: string;
}

interface ComicMetadata {
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  type: 'regular' | 'variant';
  confidence: number;
}

interface ScanResponse {
  success: boolean;
  data?: ComicMetadata;
  error?: string;
  rawResponse?: string;
}

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

const getAnthropicClient = (): Anthropic => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  
  return new Anthropic({ apiKey });
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const parseComicMetadata = (text: string): ComicMetadata | null => {
  try {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the data
      return {
        comicBookTitle: (parsed.title || parsed.comicBookTitle || '').trim(),
        comicIssue: (parsed.issue?.toString() || parsed.comicIssue?.toString() || '').trim(),
        comicBookVolume: (parsed.volume?.toString() || parsed.comicBookVolume?.toString() || '').trim(),
        comicBookYear: (parsed.year?.toString() || parsed.comicBookYear?.toString() || '').trim(),
        comicBookPublisher: (parsed.publisher || parsed.comicBookPublisher || '').trim(),
        type: parsed.type?.toLowerCase() === 'variant' ? 'variant' : 'regular',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing comic metadata:', error);
    return null;
  }
};

// ============================================================================
// CONTROLLER
// ============================================================================

export const scanComicCover = async (
  req: Request<{}, ScanResponse, ScanRequest>,
  res: Response<ScanResponse>
): Promise<Response> => {
  const { imageUrl } = req.body;
  
  console.log('📸 Scanning comic cover:', imageUrl);
  
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
    const anthropic = getAnthropicClient();
    
    console.log('🤖 Calling Claude Vision API...');
    
    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
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

4. **Year**: 4-digit publication year if visible
   - Sometimes shown in small text
   - Format: YYYY (e.g., "2023")
   - Leave empty if not visible

5. **Publisher**: The company name (Marvel, DC, Image, Dark Horse, IDW, etc.)
   - Often appears as a logo
   - Common publishers: Marvel Comics, DC Comics, Image Comics, Dark Horse Comics, IDW Publishing, Boom! Studios, Dynamite Entertainment, Valiant Comics

6. **Type**: Is this a regular issue or variant cover?
   - "variant" if you see: variant cover label, special edition text, alternate cover indicator, limited edition notation
   - "regular" for standard issues
   - Default to "regular" if unsure

7. **Confidence**: Your confidence level (0.0 to 1.0)
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
  "type": "regular or variant",
  "confidence": 0.85
}

**Examples:**

Example 1 - Clear cover:
{
  "title": "The Amazing Spider-Man",
  "issue": "300",
  "volume": "",
  "year": "1988",
  "publisher": "Marvel Comics",
  "type": "regular",
  "confidence": 0.95
}

Example 2 - Variant cover:
{
  "title": "Batman",
  "issue": "50",
  "volume": "",
  "year": "2018",
  "publisher": "DC Comics",
  "type": "variant",
  "confidence": 0.90
}

Example 3 - Partial information:
{
  "title": "Saga",
  "issue": "1",
  "volume": "",
  "year": "",
  "publisher": "Image Comics",
  "type": "regular",
  "confidence": 0.75
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
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');
    
    console.log('📝 Claude response:', responseText);
    
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
    
    console.log('✅ Extracted metadata:', metadata);
    
    return res.status(200).json({
      success: true,
      data: metadata
    });
    
  } catch (error) {
    console.error('❌ Error scanning comic cover:', error);
    
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