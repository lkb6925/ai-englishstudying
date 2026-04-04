declare namespace chrome {
  export namespace runtime {
    export const onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void) => void;
    };
    export function sendMessage(message: any): Promise<any>;
    export function getURL(path: string): string;
  }
  export namespace storage {
    export const sync: {
      get: (keys: string | string[] | null) => Promise<any>;
      set: (items: any) => Promise<void>;
    };
    export const local: {
      get: (keys: string | string[] | null) => Promise<any>;
      set: (items: any) => Promise<void>;
    };
    export const session: {
      get: (keys: string | string[] | null) => Promise<any>;
      set: (items: any) => Promise<void>;
    };
  }
}
