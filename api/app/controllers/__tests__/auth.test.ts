/// <reference types="jest" />

// ✅ Set environment variables FIRST, before any imports
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-with-minimum-32-characters-required';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock database
jest.mock('../../models', () => ({
  Users: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcryptjs');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

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
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
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
      // Updated to match actual response format
      expect(response.body.type).toBe('error');
      expect(response.body.message).toBeDefined();
    });

    it('should return token on successful login', async () => {
      const { Users } = require('../../models');
      const bcryptMocked = bcrypt as jest.Mocked<typeof bcrypt>;
      const jwtMocked = jwt as jest.Mocked<typeof jwt>;

      const mockUser = {
        id: 'test-uuid-123',
        username: 'testuser',
        email: 'test@example.com',
        password: '$2a$10$abcdefghijklmnopqrstuv',
      };

      Users.findOne.mockResolvedValue(mockUser);
      bcryptMocked.compare.mockResolvedValue(true as never);
      jwtMocked.sign.mockReturnValue('mock-jwt-token-12345' as never);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'test123456',
        });

      // Debug only if failed
      if (response.status !== 200) {
        console.log('\n❌ TEST FAILED');
        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(response.body, null, 2));
        console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
        console.log('jwt.sign called?', jwtMocked.sign.mock.calls.length > 0);
      }

      expect(response.status).toBe(200);
      // Updated to match actual response format from middleware
      expect(response.body.type).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.id).toBe('test-uuid-123');
      expect(response.body.data.username).toBe('testuser');
    });
  });
});