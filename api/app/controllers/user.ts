import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { WhereOptions } from 'sequelize';
import db from '../models';

// User type literal
type UserType = 'regular' | 'fixer';

// Properly typed model interface
interface UserModel {
  findAll: (options: { where: WhereOptions<UserAttributes> }) => Promise<UserInstance[]>;
  findByPk: (id: string) => Promise<UserInstance | null>;
  findOne: (options: { where: WhereOptions<UserAttributes> }) => Promise<UserInstance | null>;
  create: (data: UserCreationAttributes) => Promise<UserInstance>;
  update: (
    data: Partial<UserAttributes>, 
    options: { where: WhereOptions<UserAttributes>; returning: boolean }
  ) => Promise<[number, UserInstance[]]>;
  destroy: (options: { where: WhereOptions<UserAttributes> }) => Promise<number>;
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
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
  toJSON: () => UserAttributes;
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
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
}

// Creation interface
interface UserCreationAttributes {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  accesstoken?: string | null;
  type: UserType;
  profilePic?: string;
}

// Sanitized user interface (without sensitive data)
interface SanitizedUserAttributes {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  profilePic: string | null;
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
}

// API response interface
interface ApiResponse<T = SanitizedUserAttributes | SanitizedUserAttributes[]> {
  success: boolean;
  data?: T;
  count?: number;
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

// Type guard for Sequelize errors
const isSequelizeError = (error: Error | SequelizeError): error is SequelizeError => {
  return 'errors' in error && Array.isArray((error as SequelizeError).errors);
};

// Helper to get Users model
const getUsersModel = (): UserModel => {
  const Users = db.Users as UserModel;
  if (!Users) {
    throw new Error('Users model not loaded');
  }
  return Users;
};

// UUID validation
const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// User type validation
const isValidUserType = (type: string): type is UserType => {
  return type === 'regular' || type === 'fixer';
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

// Email validation
const validateEmail = (email: string): ValidationResult => {
  if (!isValidEmail(email)) {
    return {
      isValid: false,
      message: 'Invalid email format'
    };
  }
  
  return { isValid: true };
};

// UUID validation
const validateUUID = (value: string, fieldName: string): ValidationResult => {
  if (!isValidUUID(value)) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid UUID`
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

// User type validation
const validateUserType = (type: string): ValidationResult => {
  if (!isValidUserType(type.toLowerCase() as UserType)) {
    return {
      isValid: false,
      message: `Type must be either 'regular' or 'fixer'`
    };
  }
  
  return { isValid: true };
};

// Generic function to find users with filters
const findUsers = async (
  whereClause: WhereOptions<UserAttributes>
): Promise<UserInstance[]> => {
  if (!whereClause || Object.keys(whereClause).length === 0) {
    throw new Error('Invalid query parameters');
  }
  
  const Users = getUsersModel();
  return await Users.findAll({ where: whereClause });
};

// Sanitize user data by removing sensitive fields
const sanitizeUser = (user: UserAttributes): SanitizedUserAttributes => {
  const { password, accesstoken, ...safeUser } = user;
  return safeUser;
};

// Get user by user ID
export const getUser = async (
  req: Request<{ userId: string }>,
  res: Response<ApiResponse<SanitizedUserAttributes[]>>
): Promise<Response> => {
  const { userId } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['userId']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(userId, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const users = await findUsers({ id: userId });
    
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Remove sensitive data before sending
    const sanitizedUsers = users.map(user => sanitizeUser(user.toJSON()));
    
    return res.status(200).json({
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getUser');
  }
};

// Get all users with type 'regular'
export const getRegular = async (
  _req: Request,
  res: Response<ApiResponse<SanitizedUserAttributes[]>>
): Promise<Response> => {
  try {
    const regularUsers = await findUsers({ type: 'regular' });
    
    // Remove sensitive data before sending
    const sanitizedUsers = regularUsers.map(user => sanitizeUser(user.toJSON()));
    
    return res.status(200).json({
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getRegular');
  }
};

// Get all users with type 'fixer'
export const getFixer = async (
  _req: Request,
  res: Response<ApiResponse<SanitizedUserAttributes[]>>
): Promise<Response> => {
  try {
    const fixerUsers = await findUsers({ type: 'fixer' });
    
    // Remove sensitive data before sending
    const sanitizedUsers = fixerUsers.map(user => sanitizeUser(user.toJSON()));
    
    return res.status(200).json({
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getFixer');
  }
};

// Find one user by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<SanitizedUserAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const Users = getUsersModel();
    const user = await Users.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Remove sensitive data before sending
    const userJson = user.toJSON();
    const safeUser = sanitizeUser(userJson);
    
    return res.status(200).json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getOneById');
  }
};

// Create a new user
export const createUser = async (
  req: Request<{}, {}, Partial<UserCreationAttributes & { password: string }>>,
  res: Response<ApiResponse<Pick<UserAttributes, 'id'>>>
): Promise<Response> => {
  const {
    username,
    firstname,
    lastname,
    email,
    password,
    accesstoken,
    type,
  } = req.body;
  
  // Validate required fields
  const validation = validateParams(req.body as Record<string, string>, [
    'username',
    'firstname',
    'lastname',
    'email',
    'password',
    'type'
  ]);
  
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate string fields
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }
  const usernameValidation = validateString(username, 'Username');
  if (!usernameValidation.isValid) {
    return res.status(400).json({ success: false, error: usernameValidation.message });
  }
  
  if (!firstname) {
    return res.status(400).json({ success: false, error: 'First name is required' });
  }
  const firstnameValidation = validateString(firstname, 'First name');
  if (!firstnameValidation.isValid) {
    return res.status(400).json({ success: false, error: firstnameValidation.message });
  }
  
  if (!lastname) {
    return res.status(400).json({ success: false, error: 'Last name is required' });
  }
  const lastnameValidation = validateString(lastname, 'Last name');
  if (!lastnameValidation.isValid) {
    return res.status(400).json({ success: false, error: lastnameValidation.message });
  }
  
  // Validate email
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  const emailStringValidation = validateString(email, 'Email');
  if (!emailStringValidation.isValid) {
    return res.status(400).json({ success: false, error: emailStringValidation.message });
  }
  const emailFormatValidation = validateEmail(email);
  if (!emailFormatValidation.isValid) {
    return res.status(400).json({ success: false, error: emailFormatValidation.message });
  }
  
  // Validate password
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ success: false, error: passwordValidation.message });
  }
  
  // Validate user type
  if (!type) {
    return res.status(400).json({ success: false, error: 'Type is required' });
  }
  const typeValidation = validateUserType(type);
  if (!typeValidation.isValid) {
    return res.status(400).json({ success: false, error: typeValidation.message });
  }
  
  try {
    const Users = getUsersModel();
    
    // Check if username already exists
    const existingUser = await Users.findOne({ 
      where: { username: username.trim() } 
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }
    
    // Check if email already exists
    const existingEmail = await Users.findOne({ 
      where: { email: email.trim().toLowerCase() } 
    });
    
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }
    
    // Hash password with increased salt rounds for better security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create the user
    const newUser = await Users.create({
      username: username.trim(),
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      accesstoken: accesstoken || null,
      type: type.toLowerCase() as UserType,
      profilePic: 'https://herologimages.s3.us-east-2.amazonaws.com/material-design-account-icon.png',
    });
    
    return res.status(201).json({ 
      success: true,
      data: { id: newUser.id },
      message: 'User created successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 400, 'createUser');
  }
};

// Update an existing user
export const updateUser = async (
  req: Request<{ id: string }, {}, Partial<UserAttributes & { password?: string }>>,
  res: Response<ApiResponse<SanitizedUserAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  // Validate request body is not empty
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Request body cannot be empty' 
    });
  }
  
  // Sanitize and validate fields if present
  const updateData: Partial<UserAttributes> = { ...req.body };
  
  // Validate string fields if provided
  if (updateData.username !== undefined) {
    const usernameValidation = validateString(updateData.username, 'Username');
    if (!usernameValidation.isValid) {
      return res.status(400).json({ success: false, error: usernameValidation.message });
    }
    updateData.username = updateData.username.trim();
  }
  
  if (updateData.firstname !== undefined) {
    const firstnameValidation = validateString(updateData.firstname, 'First name');
    if (!firstnameValidation.isValid) {
      return res.status(400).json({ success: false, error: firstnameValidation.message });
    }
    updateData.firstname = updateData.firstname.trim();
  }
  
  if (updateData.lastname !== undefined) {
    const lastnameValidation = validateString(updateData.lastname, 'Last name');
    if (!lastnameValidation.isValid) {
      return res.status(400).json({ success: false, error: lastnameValidation.message });
    }
    updateData.lastname = updateData.lastname.trim();
  }
  
  // Validate email if provided
  if (updateData.email !== undefined) {
    const emailStringValidation = validateString(updateData.email, 'Email');
    if (!emailStringValidation.isValid) {
      return res.status(400).json({ success: false, error: emailStringValidation.message });
    }
    const emailFormatValidation = validateEmail(updateData.email);
    if (!emailFormatValidation.isValid) {
      return res.status(400).json({ success: false, error: emailFormatValidation.message });
    }
    updateData.email = updateData.email.trim().toLowerCase();
  }
  
  // Validate type if provided
  if (updateData.type !== undefined) {
    const typeValidation = validateUserType(updateData.type);
    if (!typeValidation.isValid) {
      return res.status(400).json({ success: false, error: typeValidation.message });
    }
    updateData.type = updateData.type.toLowerCase() as UserType;
  }
  
  // Hash password if provided
  if (req.body.password !== undefined) {
    const passwordValidation = validatePassword(req.body.password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: passwordValidation.message 
      });
    }
    
    const saltRounds = 12;
    updateData.password = await bcrypt.hash(req.body.password, saltRounds);
  }
  
  try {
    const Users = getUsersModel();
    
    // Check if username is being updated and already exists
    if (updateData.username) {
      const existingUser = await Users.findOne({ 
        where: { username: updateData.username } 
      });
      
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({
          success: false,
          error: 'Username already exists'
        });
      }
    }
    
    // Check if email is being updated and already exists
    if (updateData.email) {
      const existingEmail = await Users.findOne({ 
        where: { email: updateData.email } 
      });
      
      if (existingEmail && existingEmail.id !== id) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }
    
    const [rowsUpdated, updatedRecords] = await Users.update(
      updateData,
      {
        where: { id },
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found or no changes made' 
      });
    }
    
    // Handle different database dialects
    let updatedUser: UserAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedUser = updatedRecords[0].toJSON();
    } else {
      const record = await Users.findByPk(id);
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found after update' 
        });
      }
      updatedUser = record.toJSON();
    }
    
    // Remove sensitive data before sending
    const safeUser = sanitizeUser(updatedUser);
    
    return res.status(200).json({
      success: true,
      data: safeUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 400, 'updateUser');
  }
};

// Delete a user
export const removeUser = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const Users = getUsersModel();
    
    // Check if record exists before attempting deletion
    const existingRecord = await Users.findByPk(id);
    
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const rowsDeleted = await Users.destroy({ 
      where: { id }
    });
    
    if (rowsDeleted === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete user' 
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'removeUser');
  }
};