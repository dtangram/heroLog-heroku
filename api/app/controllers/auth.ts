import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Model, ModelStatic } from 'sequelize';
import db from '../models';

/**
 * Interface for user attributes
 */
interface UserAttributes {
  id: string;
  username?: string;
  email: string;
  password?: string;
  name?: string;
  googleId?: string;
  profilePicture?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface for User model instance
 */
interface UserInstance extends Model<UserAttributes>, UserAttributes {}

/**
 * Type for User model
 */
type UserModel = ModelStatic<UserInstance>;

/**
 * Get User model with fallback
 */
const getUserModel = (): UserModel => {
  const model = (db as any).Users || (db as any).User;
  
  if (!model) {
    throw new Error('User model not found in database models');
  }
  
  return model;
};

/**
 * Interface for login request body
 */
interface LoginRequestBody {
  username: string;
  password: string;
}

/**
 * Interface for Google login request body
 */
interface GoogleLoginRequestBody {
  credential: string;
}

/**
 * Interface for JWT payload
 */
interface JwtPayload {
  id: string;
  username?: string;
  email?: string;
}

/**
 * Interface for login response
 */
interface LoginResponse {
  token: string;
  loggedIn: boolean;
  id: string;
  username?: string;
  email?: string;
  name?: string;
}

/**
 * Interface for error response
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Interface for logout response
 */
interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Validates JWT secret exists
 */
const validateJwtSecret = (): string | null => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('CRITICAL: JWT_SECRET is not configured in environment variables');
    return null;
  }
  
  if (secret.length < 32) {
    console.warn('WARNING: JWT_SECRET should be at least 32 characters long');
  }
  
  return secret;
};

/**
 * Generates JWT token for authenticated user
 */
const generateToken = (payload: JwtPayload, secret: string): string => {
  return jwt.sign(payload, secret, {
    expiresIn: '24h',
    algorithm: 'HS256'
  });
};

/**
 * Validates string input
 */
const validateString = (
  value: string | number | boolean | null | undefined, 
  fieldName: string, 
  minLength: number = 1
): { isValid: boolean; message?: string } => {
  if (!value) {
    return {
      isValid: false,
      message: `${fieldName} is required`
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      message: `${fieldName} must be a string`
    };
  }

  if (value.trim().length < minLength) {
    return {
      isValid: false,
      message: `${fieldName} must be at least ${minLength} characters long`
    };
  }

  return { isValid: true };
};

/**
 * Standard username/password login
 */
export const login = async (
  req: Request<Record<string, never>, LoginResponse | ErrorResponse, LoginRequestBody>,
  res: Response<LoginResponse | ErrorResponse>
): Promise<Response> => {
  const { username, password } = req.body;

  try {
    // Validate username
    const usernameValidation = validateString(username, 'Username', 3);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ error: usernameValidation.message! });
    }

    // Validate password
    const passwordValidation = validateString(password, 'Password', 6);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.message! });
    }

    // Get User model dynamically
    const Users = getUserModel();

    // Find user by username (case-insensitive)
    const user = await Users.findOne({ 
      where: { username: username.trim().toLowerCase() } 
    });
    
    if (!user) {
      // Use generic error message to prevent username enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has a password set (might be OAuth-only user)
    if (!user.password) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'This account uses social login'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate JWT secret
    const secret = validateJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Generate JWT token
    const token = generateToken(
      { id: user.id, username: user.username },
      secret
    );

    // Build response
    const response: LoginResponse = {
      token,
      loggedIn: true,
      id: user.id,
      username: user.username,
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', errorMessage);
    return res.status(500).json({ error: 'An error occurred during login' });
  }
};

/**
 * Google OAuth login using Google Identity Services
 */
export const googleLogin = async (
  req: Request<Record<string, never>, LoginResponse | ErrorResponse, GoogleLoginRequestBody>,
  res: Response<LoginResponse | ErrorResponse>
): Promise<Response> => {
  const { credential } = req.body;

  try {
    console.log('Starting Google login...');

    // Validate credential
    const credentialValidation = validateString(credential, 'Google credential');
    if (!credentialValidation.isValid) {
      return res.status(400).json({ error: credentialValidation.message! });
    }

    // Validate Google Client ID
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('CRITICAL: GOOGLE_CLIENT_ID is not configured in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify Google credential
    const client = new OAuth2Client(googleClientId);
    let googleUser: TokenPayload;
    
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      
      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid token payload');
      }
      
      googleUser = payload;
      console.log('Google token verified for:', googleUser.email);
    } catch (verifyError) {
      const errorMsg = verifyError instanceof Error ? verifyError.message : 'Unknown error';
      console.error('Google token verification failed:', errorMsg);
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    // Extract user information
    const { email, name, picture, sub: googleId } = googleUser;

    // Validate email exists
    if (!email) {
      return res.status(400).json({ error: 'Google account email is required' });
    }

    // Get User model dynamically
    const Users = getUserModel();
    console.log('📚 User model loaded successfully');

    // Find user by email (case-insensitive)
    let user = await Users.findOne({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ 
        error: 'User does not exist',
        details: 'Please contact administrator to create an account'
      });
    }

    console.log('User found:', user.id);

    // Update user's Google information if it has changed
    const updates: Partial<UserAttributes> = {};
    
    if (user.googleId !== googleId) {
      updates.googleId = googleId;
    }
    
    if (name && user.name !== name) {
      updates.name = name;
    }
    
    if (picture && user.profilePicture !== picture) {
      updates.profilePicture = picture;
    }
    
    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      try {
        await user.update(updates);
        console.log('Updated user Google info');
      } catch (updateError) {
        const errMsg = updateError instanceof Error ? updateError.message : 'Unknown error';
        console.error('Failed to update user Google info:', errMsg);
        // Continue anyway - not critical
      }
    }

    // Validate JWT secret
    const secret = validateJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Generate JWT token
    const token = generateToken(
      { id: user.id, email: user.email },
      secret
    );

    console.log('Google login successful for user:', user.id);

    // Build response
    const response: LoginResponse = {
      token,
      loggedIn: true,
      id: user.id,
      email: user.email,
    };

    if (user.name) {
      response.name = user.name;
    }

    return res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Google login error:', errorMessage);
    return res.status(500).json({ error: 'An error occurred during login' });
  }
};

/**
 * Logout endpoint (optional - for token blacklisting in the future)
 */
export const logout = async (
  _req: Request,
  res: Response<LogoutResponse | ErrorResponse>
): Promise<Response> => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token. However, you could implement token blacklisting here.
    
    return res.status(200).json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Logout error:', errorMessage);
    return res.status(500).json({ error: 'An error occurred during logout' });
  }
};