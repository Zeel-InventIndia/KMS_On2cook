import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single Supabase client instance
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
  }
  return supabaseClient;
};

// Export the client for backwards compatibility
export const supabase = getSupabaseClient();

// Make supabase globally available for components that need it
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}