import { z } from 'zod'

const clientEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url('VITE_SUPABASE_URL must be valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'VITE_SUPABASE_ANON_KEY missing or too short'),
})

type ClientEnvInput = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

export function parseClientEnv(input: ClientEnvInput) {
  return clientEnvSchema.parse(input)
}

export const clientEnv = parseClientEnv({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

