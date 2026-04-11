declare namespace chrome {
  export namespace runtime {
    export const onMessage: {
      addListener: (
        callback: (
          message: any,
          sender: any,
          sendResponse: (response: any) => void
        ) => boolean | void
      ) => void;
    };
    export function sendMessage(message: any): Promise<any>;
    export function getURL(path: string): string;
    export function openOptionsPage(): void;
  }
  export namespace tabs {
    export function create(createProperties: { url: string }): Promise<void>;
  }
  export namespace storage {
    export const sync: {
      get: (keys: string | string[] | null) => Promise<any>;
      set: (items: any) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
    };
    export const local: {
      get: (keys: string | string[] | null) => Promise<any>;
      set: (items: any) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
    };
    export const session: {
      get: (keys: string | string[] | null) => Promise<any>;
      set: (items: any) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
    };
  }
}

interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CODESPACE_NAME?: string;
  readonly VITE_CODESPACES_PORT_FORWARDING_DOMAIN?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
