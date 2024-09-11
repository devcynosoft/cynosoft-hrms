import { createClient } from "@supabase/supabase-js";

const getSupabaseEnv = () => {
  if (process.env.NEXT_PUBLIC_NODE_ENV === "production") {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_PRODUCTION,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PRODUCTION,
    };
  } else {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL,
    };
  }
};

const { url, anonKey } = getSupabaseEnv();

export const supabase = createClient(url, anonKey);
