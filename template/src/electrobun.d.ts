declare module 'electrobun/bun' {
  export class BrowserWindow {
    constructor(config: {
      title: string;
      url: string;
      frame: { width: number; height: number; x: number; y: number };
      rpc?: {
        send?: (message: unknown) => void;
        onMessage?: (handler: (message: unknown) => void) => void;
        isConnected?: () => boolean;
      };
    });
    on(event: 'close', callback: () => void): void;
  }

  export class Updater {
    static localInfo: {
      channel: () => Promise<string>;
    };
  }

  export class Utils {
    static quit(): void;
  }

  export class BrowserView {
    static getById(id: number): BrowserView | undefined;
    static defineRPC(config: {
      maxRequestTime?: number;
      handlers: {
        requests: Record<string, (params: unknown) => Promise<unknown>>;
        messages: Record<string, unknown>;
      };
    }): {
      request: (method: string, params: unknown) => Promise<unknown>;
      send: (event: string, data: string) => void;
    };
  }

  export interface ApplicationMenuItemConfig {
    label?: string;
    role?: string;
    type?: 'normal' | 'separator' | 'divider';
    submenu?: ApplicationMenuItemConfig[];
    enabled?: boolean;
    checked?: boolean;
    hidden?: boolean;
    accelerator?: string;
    action?: string;
    data?: unknown;
  }

  export const ApplicationMenu: {
    setApplicationMenu: (menu: ApplicationMenuItemConfig[]) => void;
    on: (name: 'application-menu-clicked', handler: (event: unknown) => void) => void;
  };
}