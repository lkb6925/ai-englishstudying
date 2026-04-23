import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  createUserScopedSupabase,
  getSupabaseUser,
  type UserScopedSupabase,
} from '../../src/server/context';

export type AppContext = {
  createUserScopedSupabase: (jwt: string) => UserScopedSupabase | null;
  getSupabaseUser: (jwt: string) => Promise<User | null>;
};

export function createAppContext(): AppContext {
  return {
    createUserScopedSupabase,
    getSupabaseUser,
  };
}
