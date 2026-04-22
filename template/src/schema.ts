import type { RPCMethods, RPCEvents } from '../packages/rpc-core/src/index';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
}

export interface ResourceInfo {
  type: 'text' | 'binary' | 'large';
  content?: string;
  url?: string;
  path: string;
  size: number;
  mimeType?: string;
}

export interface PiAgentMethods extends RPCMethods {
  hello: {
    params: { name: string };
    result: { message: string; timestamp: number };
  };
  echo: {
    params: unknown;
    result: unknown;
  };
  ping: {
    params: undefined;
    result: { pong: boolean; timestamp: number; platform: string };
  };
  listDir: {
    params: { path: string };
    result: { entries: FileEntry[]; basePath: string };
  };
  readFile: {
    params: { path: string };
    result: ResourceInfo;
  };
}

export interface PiAgentEvents extends RPCEvents {
  heartbeat: {
    payload: { serverTime: number };
    metadata: { server: string; platform: string };
  };
}
