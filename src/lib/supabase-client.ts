import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || "https://rkvsmpzghtjusqpfzybt.supabase.co";
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "sb_publishable_q-KLHu3f52HTWZ_5K8SEvA_ah2wVGvW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
