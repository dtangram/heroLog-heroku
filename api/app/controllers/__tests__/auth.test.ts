/// <reference types="jest" />

import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';

// Mock database
jest.mock('../../models', () => ({
  Users: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

import authRoutes from '../../routes/auth';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'test123456' });

      expect(response.status).toBe(400);
      // Actual format: { success: false, errors: [{ field: 'username', message: '...' }] }
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.some((e: any) => e.field === 'username')).toBe(true);
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      // Actual format: { success: false, errors: [{ field: 'password', message: '...' }] }
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.some((e: any) => e.field === 'password')).toBe(true);
    });

    it('should return 401 if credentials are invalid', async () => {
      const { Users } = require('../../models');
      Users.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      // Actual format: { type: 'error', message: '...' }
      expect(response.body.type).toBe('error');
      expect(response.body.message).toBeDefined();
    });

    it('should return token on successful login', async () => {
      const { Users } = require('../../models');

      const mockUser = {
        id: 'test-uuid-123',
        username: 'testuser',
        password: await bcrypt.hash('test123456', 10),
      };

      Users.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'test123456',
        });

      expect(response.status).toBe(200);
      // Actual format: { type: 'success', data: { token, id, username }, message: '...', timestamp: '...' }
      expect(response.body.type).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.id).toBe('test-uuid-123');
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});