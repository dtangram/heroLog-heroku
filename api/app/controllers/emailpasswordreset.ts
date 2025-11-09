import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { WhereOptions } from 'sequelize';

// Properly typed model interface
interface UserModel {
  findOne: (options: { where: WhereOptions<UserAttributes> }) => Promise<UserInstance | null>;
  findByPk: (id: string) => Promise<UserInstance | null>;
}

// Model instance interface
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

// User attributes interface (matching actual model structure)
interface UserAttributes {
  id: string;  // UUID string
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

// Request body interfaces
interface PasswordResetRequestBody {
  email: string;
}

interface VerifyTokenRequestBody {
  token: string;
}

interface ResetPasswordRequestBody {
  token: string;
  newPassword: string;
}

interface ChangePasswordRequestBody {
  currentPassword: string;
  newPassword: string;
}

// JWT payload interface with proper UUID typing
interface PasswordResetTokenPayload {
  id: string;  // UUID string, not number
  email: string;
  purpose: string;
  iat?: number;
  exp?: number;
}

// API response interface without any
interface ApiResponse<T = Record<string, string | number>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  userId?: string;  // UUID string
  token?: string;
}

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Extended Request type for authenticated users (using intersection type)
type AuthenticatedRequest<P = {}, ResBody = {}, ReqBody = {}> = Request<P, ResBody, ReqBody> & {
  user?: {
    id: string;  // UUID string
    email: string;
  };
};

// Import models with proper typing
const models = require('../models') as {
  Users: UserModel;
};

const { Users } = models;

// Email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password strength validation
const validatePasswordStrength = (password: string): ValidationResult => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      message: 'Password must not exceed 128 characters'
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one letter'
    };
  }

  return { isValid: true };
};

// JWT secret validation
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

// String validation
const validateString = (value: string, fieldName: string): ValidationResult => {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      message: `${fieldName} must be a string`
    };
  }
  
  if (value.trim().length === 0) {
    return {
      isValid: false,
      message: `${fieldName} cannot be empty`
    };
  }
  
  return { isValid: true };
};

// Request password reset token
export const emailPasswordReset = async (
  req: Request<{}, ApiResponse<{ userId: string; email: string }>, PasswordResetRequestBody>,
  res: Response<ApiResponse<{ userId: string; email: string }>>
): Promise<Response> => {
  const { email } = req.body;

  try {
    // Validate email is provided
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email is required' 
      });
    }

    // Validate email format
    const emailValidation = validateString(email, 'Email');
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: emailValidation.message 
      });
    }

    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Find user by email (case-insensitive)
    const user = await Users.findOne({ 
      where: { email: email.trim().toLowerCase() } 
    });
    
    // SECURITY: Don't reveal if user exists or not
    // Always return success to prevent email enumeration
    if (!user) {
      console.warn(`Password reset requested for non-existent email: ${email}`);
      return res.status(200).json({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Validate JWT secret
    const secret = validateJwtSecret();
    if (!secret) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error' 
      });
    }

    // Generate password reset token (expires in 1 hour)
    const tokenPayload: PasswordResetTokenPayload = { 
      id: user.id, 
      email: user.email,
      purpose: 'password-reset' 
    };

    const token = jwt.sign(
      tokenPayload,
      secret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    // TODO: In production, send email instead of returning token
    // Example:
    // await sendPasswordResetEmail(user.email, token);
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    // await emailService.send({
    //   to: user.email,
    //   subject: 'Password Reset Request',
    //   html: `Click here to reset your password: ${resetLink}`
    // });
    
    console.log(`Password reset token generated for user ID: ${user.id}`);

    // DEVELOPMENT ONLY: Return token directly
    // In production, remove this and send via email only
    if (process.env.NODE_ENV === 'development') {
      return res.status(200).json({
        success: true,
        token,
        message: 'Password reset token generated (development only)',
        data: {
          userId: user.id,
          email: user.email
        }
      });
    }

    // PRODUCTION: Generic success message
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'An error occurred while processing your request' 
    });
  }
};

// Verify password reset token validity
export const verifyResetToken = async (
  req: Request<{}, ApiResponse<{ email: string }>, VerifyTokenRequestBody>,
  res: Response<ApiResponse<{ email: string }>>
): Promise<Response> => {
  const { token } = req.body;

  try {
    // Validate token is provided
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'Token is required' 
      });
    }

    // Validate token format
    const tokenValidation = validateString(token, 'Token');
    if (!tokenValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: tokenValidation.message 
      });
    }

    // Validate JWT secret
    const secret = validateJwtSecret();
    if (!secret) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error' 
      });
    }

    // Verify token
    let decoded: PasswordResetTokenPayload;
    
    try {
      decoded = jwt.verify(token, secret) as PasswordResetTokenPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          error: 'Token has expired. Please request a new password reset link.' 
        });
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token' 
        });
      } else {
        throw jwtError;
      }
    }

    // Check if token purpose is correct
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid token type' 
      });
    }

    // Verify user still exists
    const user = await Users.findByPk(decoded.id);  // UUID string, no parseInt needed
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User account not found' 
      });
    }

    // Verify email matches (in case user changed email)
    if (user.email.toLowerCase() !== decoded.email.toLowerCase()) {
      return res.status(400).json({ 
        success: false,
        error: 'Token is no longer valid. Please request a new password reset.' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      userId: user.id,  // UUID string
      data: {
        email: user.email
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'An error occurred while verifying token' 
    });
  }
};

// Reset password using valid token
export const resetPassword = async (
  req: Request<{}, ApiResponse<never>, ResetPasswordRequestBody>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { token, newPassword } = req.body;

  try {
    // Validate inputs
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Token and new password are required' 
      });
    }

    // Validate token format
    const tokenValidation = validateString(token, 'Token');
    if (!tokenValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: tokenValidation.message 
      });
    }

    // Validate password format
    const passwordFormatValidation = validateString(newPassword, 'New password');
    if (!passwordFormatValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: passwordFormatValidation.message 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: passwordValidation.message 
      });
    }

    // Validate JWT secret
    const secret = validateJwtSecret();
    if (!secret) {
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error' 
      });
    }

    // Verify token
    let decoded: PasswordResetTokenPayload;
    
    try {
      decoded = jwt.verify(token, secret) as PasswordResetTokenPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          error: 'Token has expired. Please request a new password reset link.' 
        });
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token' 
        });
      } else {
        throw jwtError;
      }
    }

    // Check token purpose
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid token type' 
      });
    }

    // Find user
    const user = await Users.findByPk(decoded.id);  // UUID string, no parseInt needed
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User account not found' 
      });
    }

    // Verify email matches
    if (user.email.toLowerCase() !== decoded.email.toLowerCase()) {
      return res.status(400).json({ 
        success: false,
        error: 'Token is no longer valid. Please request a new password reset.' 
      });
    }

    // Check if new password is same as old password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ 
          success: false,
          error: 'New password must be different from your current password' 
        });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({ password: hashedPassword });

    console.log(`Password reset successful for user ID: ${user.id}`);

    // Optional: Invalidate all existing sessions/tokens for this user
    // This would require a token blacklist or session management system

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'An error occurred while resetting password' 
    });
  }
};

// Change password for authenticated users (not using reset token)
export const changePassword = async (
  req: AuthenticatedRequest<{}, ApiResponse<never>, ChangePasswordRequestBody>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { currentPassword, newPassword } = req.body;
  
  // Note: This assumes you have authentication middleware that adds user to req
  const userId = req.user?.id;

  try {
    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Current password and new password are required' 
      });
    }

    // Validate current password format
    const currentPasswordValidation = validateString(currentPassword, 'Current password');
    if (!currentPasswordValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: currentPasswordValidation.message 
      });
    }

    // Validate new password format
    const newPasswordFormatValidation = validateString(newPassword, 'New password');
    if (!newPasswordFormatValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: newPasswordFormatValidation.message 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: passwordValidation.message 
      });
    }

    // Find user
    const user = await Users.findByPk(userId);  // UUID string, no parseInt needed
    
    if (!user || !user.password) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Current password is incorrect' 
      });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'New password must be different from current password' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({ password: hashedPassword });

    console.log(`Password changed successfully for user ID: ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'An error occurred while changing password' 
    });
  }
};