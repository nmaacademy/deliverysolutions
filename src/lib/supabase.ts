import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

/**
 * The app deliberately keeps working from localStorage when the cloud variables are missing or
 * Supabase is offline. Only the public/publishable key is ever bundled into the browser.
 */
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

export const isCloudSyncConfigured = supabase !== null;
