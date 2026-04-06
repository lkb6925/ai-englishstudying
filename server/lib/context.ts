import { GoogleGenAI } from '@google/genai';
import {
  createClient,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

export type UserScopedSupabase = SupabaseClient;

export type AppContext = {
  ai: GoogleGenAI | null;
  createUserScopedSupabase: (jwt: string) => UserScopedSupabase | null;
  getSupabaseUser: (jwt: string) => Promise<User | null>;
};

export function createAppContext(): AppContext {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const ai = geminiApiKey
    ? new GoogleGenAI({ apiKey: geminiApiKey })
    : null;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const authClient =
    supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  function createUserScopedSupabase(jwt: string): UserScopedSupabase | null {
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    });
  }

  async function getSupabaseUser(jwt: string): Promise<User | null> {
    if (!authClient) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await authClient.auth.getUser(jwt);

    if (error) {
      return null;
    }

    return user;
  }

  return {
    ai,
    createUserScopedSupabase,
    getSupabaseUser,
  };
}
