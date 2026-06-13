import { ICAClient } from './client';
import { ICAConfig } from './types';
import { createRequireAuth, createOptionalAuth } from './middleware';
export * from './types';
export * from './errors';
export { ICAClient } from './client';
export interface IGlobalsAuthInstance extends ICAClient {
    requireAuth: ReturnType<typeof createRequireAuth>;
    optionalAuth: ReturnType<typeof createOptionalAuth>;
}
export declare function createIGlobalsAuth(config: ICAConfig): IGlobalsAuthInstance;
