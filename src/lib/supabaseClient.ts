import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const missingMessage =
  "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in Vercel Environment Variables and redeploy.";

export const missingSupabaseEnv = !url || !key;
export const supabaseEnvErrorMessage = missingMessage;

// Use a lazy throwing proxy so the app can still render a helpful UI instead of crashing at startup.
const missingEnvProxy = new Proxy(() => undefined, {
  get: () => missingEnvProxy,
  apply: () => Promise.reject(new Error(missingMessage)),
}) as unknown as SupabaseClient;

export const sb = missingSupabaseEnv ? missingEnvProxy : createClient(url, key);
