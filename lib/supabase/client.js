import { createClient } from "@supabase/supabase-js";

// Browser client — uses the public anon key only.
// Row Level Security in Supabase should restrict what this client can touch.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
