import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

// env.ts handles loading variables from import.meta.env or a local fallback,
// and also throws an error if they are not found.
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
