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
import { normalizeYear, parseComicMetadata } from '../aiScanner';

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
  describe('creator credits', () => {
    // What Claude returns for Batman #491 (credit box: "DOUG MOENCH / JIM APARO")
    const batman491 = JSON.stringify({
      title: 'Batman',
      issue: '491',
      volume: '',
      year: '',
      publisher: 'DC Comics',
      author: 'Doug Moench',
      penciler: 'Jim Aparo',
      inker: '',
      coverartist: '',
      type: 'regular',
      confidence: 0.9,
    });

    beforeEach(() => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' },
      });
      mockCreate.mockResolvedValue({ content: [{ type: 'text', text: batman491 }] });
    });

    it('returns the writer and artist read from the cover', async () => {
      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({ imageUrl: 'https://example.com/batman-491.jpg' });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        comicIssue: '491',
        author: 'Doug Moench',
        penciler: 'Jim Aparo',
        inker: '',
        coverartist: '',
      });
    });

    it('asks Claude to read the credit box without guessing the cover artist', async () => {
      await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({ imageUrl: 'https://example.com/batman-491.jpg' });

      const prompt = mockCreate.mock.calls[0][0].messages[0].content[1].text as string;
      expect(prompt).toMatch(/credit box/i);
      expect(prompt).toMatch(/"author"/);
      expect(prompt).toMatch(/not the cover artist/i);
      expect(prompt).toMatch(/never fill a creator from memory/i);
    });

    it('tells Claude a third unlabeled name is the inker', async () => {
      await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({ imageUrl: 'https://example.com/detective-comics.jpg' });

      const prompt = mockCreate.mock.calls[0][0].messages[0].content[1].text as string;
      expect(prompt).toMatch(/three names[^\n]*writer \(author\), then penciler, then inker/i);
      expect(prompt).toMatch(/with only two names, leave inker empty/i);
    });

    it('returns all three creators from a three-name credit box', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: 'Detective Comics',
              issue: '601',
              publisher: 'DC Comics',
              author: 'Alan Grant',
              penciler: 'Norm Breyfogle',
              inker: 'Steve Mitchell',
              coverartist: '',
              type: 'regular',
              confidence: 0.9,
            }),
          },
        ],
      });

      const response = await request(app)
        .post('/api/ai/scan-comic-cover')
        .send({ imageUrl: 'https://example.com/detective-comics.jpg' });

      expect(response.body.data).toMatchObject({
        author: 'Alan Grant',
        penciler: 'Norm Breyfogle',
        inker: 'Steve Mitchell',
      });
    });

    it('accepts writer/artist as alternate keys and blanks missing creators', () => {
      expect(
        parseComicMetadata('{"title":"Batman","issue":"491","writer":"Doug Moench","artist":"Jim Aparo"}')
      ).toMatchObject({ author: 'Doug Moench', penciler: 'Jim Aparo', inker: '', coverartist: '' });

      expect(parseComicMetadata('{"title":"Batman","issue":"423"}')).toMatchObject({
        author: '',
        penciler: '',
        inker: '',
        coverartist: '',
      });
    });
  });
  describe('year from the cover date', () => {
    it('tells Claude to read two-digit years from the cover date', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('fake-image-data'),
        headers: { 'content-type': 'image/jpeg' },
      });
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"title":"Batman","issue":"491","year":"1993"}' }],
      });

      await request(app).post('/api/ai/scan-comic-cover').send({ imageUrl: 'https://example.com/b.jpg' });

      const prompt = mockCreate.mock.calls[0][0].messages[0].content[1].text as string;
      expect(prompt).toMatch(/including the cover date/i);
      expect(prompt).toMatch(/"93" → "1993"/);
      expect(prompt).toMatch(/a month alone .* is not a year/i);
    });

    it('expands two-digit years and keeps four-digit years', () => {
      expect(normalizeYear('1993')).toBe('1993');
      expect(normalizeYear('93')).toBe('1993');
      expect(normalizeYear("'87")).toBe('1987');
      expect(normalizeYear('05')).toBe('2005');
      expect(normalizeYear(1994)).toBe('1994');
    });

    it('leaves the year blank when no year is printed', () => {
      expect(normalizeYear('')).toBe('');
      expect(normalizeYear('APR')).toBe('');
      expect(normalizeYear(undefined)).toBe('');
      expect(parseComicMetadata('{"title":"Batman","issue":"491","year":"APR"}')?.comicBookYear).toBe('');
    });
  });
});