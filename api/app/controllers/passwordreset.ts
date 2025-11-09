import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { WhereOptions } from 'sequelize';

// Properly typed model interface
interface UserModel {
  findOne: (options: { where: WhereOptions<UserAttributes> }) => Promise<UserInstance | null>;
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

// Fixed interface to match actual model structure (UUIDs, not numbers)
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
interface PasswordResetUpdateBody {
  username: string;
  password: string;
}

// API response interface
interface ApiResponse<T = Record<string, string>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Sequelize error interface
interface SequelizeError {
  errors: Array<{ message: string }>;
}

// Import models with proper typing
const models = require('../models') as {
  Users: UserModel;
};

const { Users } = models;

// Type guard for Sequelize errors
const isSequelizeError = (error: Error | SequelizeError): error is SequelizeError => {
  return 'errors' in error && Array.isArray((error as SequelizeError).errors);
};

// Centralized error handler
const handleError = (
  res: Response,
  error: Error | SequelizeError,
  statusCode: number = 500,
  context: string = ''
): Response<ApiResponse<never>> => {
  console.error(`Error in ${context}:`, error);
  
  let errors: string[];
  
  if (isSequelizeError(error)) {
    errors = error.errors.map(err => err.message);
  } else {
    errors = [error.message];
  }
  
  return res.status(statusCode).json({ 
    success: false,
    errors 
  });
};

// Parameter validation
const validateParams = (
  params: Record<string, string>,
  requiredFields: string[]
): ValidationResult => {
  const missing = requiredFields.filter(field => !params[field]);
  
  if (missing.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { isValid: true };
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

// Password validation
const validatePassword = (password: string): ValidationResult => {
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

// Verify password reset token and return user info
export const passwordReset = async (
  req: Request<{ token: string }>,
  res: Response<ApiResponse<{ username: string }>>
): Promise<Response> => {
  const { token } = req.params;
  
  // Validate token parameter
  const paramValidation = validateParams(req.params, ['token']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate token is not empty
  const tokenValidation = validateString(token, 'Reset token');
  if (!tokenValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: tokenValidation.message 
    });
  }
  
  try {
    const user = await Users.findOne({
      where: {
        accesstoken: token.trim(),
      },
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Password reset link is invalid or has expired'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        username: user.username
      },
      message: 'Password reset token verified'
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'passwordReset');
  }
};

// Update user password after reset
export const passwordResetUpdate = async (
  req: Request<{}, {}, PasswordResetUpdateBody>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { username, password } = req.body;
  
  // Validate required fields
  const validation = validateParams(req.body as unknown as Record<string, string>, ['username', 'password']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate username
  if (!username) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username is required' 
    });
  }
  
  const usernameValidation = validateString(username, 'Username');
  if (!usernameValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: usernameValidation.message 
    });
  }
  
  // Validate password
  if (!password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Password is required' 
    });
  }
  
  const passwordFormatValidation = validateString(password, 'Password');
  if (!passwordFormatValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: passwordFormatValidation.message 
    });
  }
  
  // Validate password strength
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
        error: 'User does not exist'
      });
    }
    
    // Check if new password is same as old password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({ 
          success: false,
          error: 'New password must be different from your current password' 
        });
      }
    }
    
    // Hash the new password
    const saltRounds = 12; // Increased from default 10 for better security
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update user password and clear access token
    await user.update({
      password: hashedPassword,
      accesstoken: null,
    });
    
    console.log(`Password reset completed for user: ${user.username}`);
    
    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'passwordResetUpdate');
  }
};