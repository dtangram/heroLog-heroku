import request from 'supertest';
import express from 'express';
import aiScannerRoutes from '../../routes/aiScanner';

jest.mock('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use('/api/ai', aiScannerRoutes);

describe('AI Scanner Controller', () => {
  describe('POST /api/ai/scan-comic-cover', () => {
    it('should return 400 if imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Image URL is required');
    });

    it('should return 400 if imageUrl is invalid', async () => {
      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({ imageUrl: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid image URL');
    });

    it('should successfully scan a valid image URL', async () => {
      const Anthropic = require('@anthropic-ai/sdk');
      
      Anthropic.prototype.messages = {
        create: jest.fn().mockResolvedValue({
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
        }),
      };

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
  });
});