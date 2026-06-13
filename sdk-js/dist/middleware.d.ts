import { RequestHandler } from 'express';
import { ICAClient } from './client';
import { JWTPayload } from './types';
declare global {
    namespace Express {
        interface Request {
            icaUser?: JWTPayload;
        }
    }
}
export declare function createRequireAuth(ica: ICAClient): RequestHandler;
export declare function createOptionalAuth(ica: ICAClient): RequestHandler;
