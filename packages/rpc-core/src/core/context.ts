export interface RequestContext {
  userId?: string;
  role?: string;
  source: 'local' | 'remote';
  token?: string;
  [key: string]: unknown;
}

export function createLocalContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    source: 'local',
    userId: 'local-user',
    role: 'admin',
    ...overrides,
  };
}

export function createRemoteContext(userId: string, overrides?: Partial<RequestContext>): RequestContext {
  return {
    source: 'remote',
    userId,
    ...overrides,
  };
}
