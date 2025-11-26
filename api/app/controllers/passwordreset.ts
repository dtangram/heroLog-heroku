import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { WhereOptions } from 'sequelize';
import db from '../models';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UserModel {
  findOne: (options: { where: WhereOptions<UserAttributes> }) => Promise<UserInstance | null>;
  findByPk: (id: string) => Promise<UserInstance | null>;
}

interface UserInstance {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  accesstoken: string | null;
  password: string | null;
  profilePic: string | null;
  type: 'regular' | 'fixer';
  createdAt: Date;
  updatedAt: Date;
  update: (data: Partial<UserAttributes>) => Promise<UserInstance>;
}

interface UserAttributes {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  accesstoken: string | null;
  password: string | null;
  profilePic: string | null;
  type: 'regular' | 'fixer';
  createdAt: Date;
  updatedAt: Date;
}

interface PasswordResetUpdateBody {
  username: string;
  password: string;
}

interface ApiResponse<T = Record<string, string>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface JwtPayload {
  id: string;
  email: string;
  purpose: string;
  iat?: number;
  exp?: number;
}

// ============================================================================
// MODELS
// ============================================================================

const Users = (db as any).Users as UserModel;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validatePassword = (password: string): ValidationResult => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Password must not exceed 128 characters' };
  }
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one letter' };
  }
  return { isValid: true };
};

// ============================================================================
// VERIFY JWT TOKEN AND RETURN USER INFO
// ============================================================================

export const passwordReset = async (
  req: Request<{ token: string }>,
  res: Response<ApiResponse<{ username: string; email: string }>>
): Promise<Response> => {
  const { token } = req.params;

  console.log('🔑 Password reset token verification requested');

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Reset token is required'
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, secret) as JwtPayload;

    console.log('🔑 Token decoded:', { id: decoded.id, email: decoded.email, purpose: decoded.purpose });

    // Check token purpose
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // Find user by ID from token
    const user = await Users.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify email matches
    if (user.email.toLowerCase() !== decoded.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Token is no longer valid'
      });
    }

    console.log('✅ Token verified for user:', user.username);

    return res.status(200).json({
      success: true,
      message: 'Password reset OK',
      data: {
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Reset link has expired. Please request a new one.'
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid reset link'
      });
    }

    console.error('Password reset verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
};

// ============================================================================
// UPDATE PASSWORD
// ============================================================================

export const passwordResetUpdate = async (
  req: Request<{}, {}, PasswordResetUpdateBody>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { username, password } = req.body;

  console.log('🔑 Password update requested for:', username);

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: passwordValidation.message
    });
  }

  try {
    const user = await Users.findOne({
      where: { username: username.trim() }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if new password is same as old
    if (user.password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          error: 'New password must be different from your current password'
        });
      }
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 12);
    await user.update({
      password: hashedPassword,
      accesstoken: null,
    });

    console.log('✅ Password updated for user:', username);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating password'
    });
  }
};