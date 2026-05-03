import type { RPCEvent } from './types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function matchFilter<Metadata>(event: RPCEvent<Metadata>, filter: Record<string, unknown>): boolean {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  if (!event.metadata) {
    return false;
  }

  for (const key in filter) {
    const filterValue = filter[key];
    const eventValue = (event.metadata as Record<string, unknown>)[key];
    
    if (filterValue !== undefined && eventValue !== filterValue) {
      return false;
    }
  }

  return true;
}
