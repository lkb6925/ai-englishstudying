import { GoogleGenAI } from '@google/genai';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export type UserScopedSupabase = SupabaseClient;

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

  return { supabaseUrl, supabaseAnonKey };
}

export function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY ?? '';
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
}

export function createUserScopedSupabase(jwt: string): UserScopedSupabase | null {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

export async function getSupabaseUser(jwt: string): Promise<User | null> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(jwt);

  if (error) {
    return null;
  }

  return user;
}
