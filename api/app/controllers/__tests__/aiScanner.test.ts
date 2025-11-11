/// <reference types="jest" />

import request from 'supertest';
import express from 'express';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock Anthropic SDK
const mockCreate = jest.fn();
const mockAnthropicClient = {
  messages: {
    create: mockCreate
  }
};

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => mockAnthropicClient);
});

import aiScannerRoutes from '../../routes/aiScanner';

const app = express();
app.use(express.json());
app.use('/api/ai', aiScannerRoutes);

describe('AI Scanner Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set environment variable for tests
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  });

  describe('POST /api/ai/scan-comic-cover', () => {
    it('should return 400 if imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if imageUrl is invalid', async () => {
      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({ imageUrl: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should successfully scan a valid image URL', async () => {
      // Mock axios.get for downloading the image
      const mockImageData = Buffer.from('fake-image-data');
      (axios.get as jest.Mock).mockResolvedValue({
        data: mockImageData,
        headers: {
          'content-type': 'image/jpeg'
        }
      });

      // Mock Anthropic response
      const mockAnthropicResponse = {
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
      };

      mockCreate.mockResolvedValue(mockAnthropicResponse);

      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({
          imageUrl: 'https://example.com/batman.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comicBookTitle', 'Batman');
      expect(response.body.data).toHaveProperty('comicIssue', '1');
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
    });
  });
});