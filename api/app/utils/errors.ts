import { ValidationError } from 'sequelize';

export const errorMessages = (error: Error): string[] =>
  error instanceof ValidationError ? error.errors.map(item => item.message) : [error.message];