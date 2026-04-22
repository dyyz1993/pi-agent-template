export type RPCMethodSchema = {
  params?: unknown;
  result: unknown;
};

export type RPCEventSchema = {
  payload: unknown;
  metadata?: Record<string, unknown>;
};

export type RPCMethods = Record<string, RPCMethodSchema>;
export type RPCEvents = Record<string, RPCEventSchema>;

export type MethodParams<T extends RPCMethods, M extends keyof T> =
  T[M]['params'] extends undefined ? undefined : T[M]['params'];

export type MethodResult<T extends RPCMethods, M extends keyof T> = T[M]['result'];

export type EventPayload<T extends RPCEvents, E extends keyof T> = T[E]['payload'];

export type EventMetadata<T extends RPCEvents, E extends keyof T> =
  T[E]['metadata'] extends Record<string, unknown> ? T[E]['metadata'] : Record<string, unknown>;

export type HasParams<P> = P extends undefined ? false : true;
