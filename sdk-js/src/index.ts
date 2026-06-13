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

export function createIGlobalsAuth(config: ICAConfig): IGlobalsAuthInstance {
  const client = new ICAClient(config);
  
  const instance = client as IGlobalsAuthInstance;
  instance.requireAuth = createRequireAuth(client);
  instance.optionalAuth = createOptionalAuth(client);
  
  return instance;
}
