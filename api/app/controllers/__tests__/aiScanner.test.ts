/// <reference types="jest" />

import request from 'supertest';
import express from 'express';
import axios from 'axios';

// Mock axios BEFORE importing routes
jest.mock('axios');

// Mock Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate
    }
  }));
});

import aiScannerRoutes from '../../routes/aiScanner';

const app = express();
app.use(express.json());
app.use('/api/ai', aiScannerRoutes);

describe('AI Scanner Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ Set the API key that your controller checks for
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-api-key-for-testing';
  });

  afterEach(() => {
    // Clean up
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('POST /api/ai/scan-comic-cover', () => {
    it('should return 400 if imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if imageUrl is invalid', async () => {
      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({ imageUrl: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should successfully scan a valid image URL', async () => {
      // Mock axios.get for downloading the image
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('fake-image-data'),
        headers: {
          'content-type': 'image/jpeg'
        }
      });

      // Mock Anthropic response
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: 'Batman',
              issue: '1',
              volume: '',
              year: '1940',
              publisher: 'DC Comics',
              type: 'regular',
              confidence: 0.95,
            }),
          },
        ],
      });

      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({
          imageUrl: 'https://example.com/batman.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.comicBookTitle).toBe('Batman');
      expect(response.body.data.comicIssue).toBe('1');
      expect(response.body.data.comicBookPublisher).toBe('DC Comics');
    });

    it('should handle image download errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Failed to download'));

      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({
          imageUrl: 'https://example.com/batman.jpg',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});