import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ICAClient } from './client';
import { JWTPayload } from './types';

declare global {
  namespace Express {
    interface Request {
      icaUser?: JWTPayload;
    }
  }
}

export function createRequireAuth(ica: ICAClient): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'unauthorized', error_description: 'Bearer token missing or malformed.', status: 401 });
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = await ica.verifyToken(token);
      req.icaUser = payload;
      next();
    } catch (err: any) {
      res.status(401).json({ error: 'unauthorized', error_description: err.message, status: 401 });
    }
  };
}

export function createOptionalAuth(ica: ICAClient): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = await ica.verifyToken(token);
      req.icaUser = payload;
    } catch (err) {
      // Ignore errors for optional auth
    }
    next();
  };
}
