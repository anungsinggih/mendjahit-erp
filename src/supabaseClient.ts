import { createClient } from '@supabase/supabase-js'
import { clientEnv } from './lib/env'

export const supabase = createClient(
    clientEnv.VITE_SUPABASE_URL,
    clientEnv.VITE_SUPABASE_ANON_KEY,
)
