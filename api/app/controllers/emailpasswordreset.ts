import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db from '../models';

interface PasswordResetRequestBody {
  email: string;
}

interface ApiResponse<T = Record<string, string | number>> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  userId?: string;  // UUID string
  token?: string;
  loggedIn?: boolean
}

export const emailPasswordReset = async (req: Request<{}, ApiResponse<{ userId: string; email: string }>, PasswordResetRequestBody>,
  res: Response<ApiResponse<{ userId: string; email: string }>>
): Promise<Response> => {
  const { email } = req.body;
  const Users = (db).Users;
  try {
    const user = await Users.findOne({ where: { email } });

    const secret = process.env.JWT_SECRET || 'JWT SECRET';

    const token = jwt.sign({ id: user.id }, secret);

    if (!email) {
      // Return 400 error message (User doesn't exists)
      return res.status(400).send({
        error: 'Email does not exist',
        success: false
      });
    }
    return res.json({
      token, loggedIn: true, userId: user.id,
      success: false
    });
  } catch (err) {
    return res.status(400).send({
      error: err as string,
      success: false
    });
  }
};