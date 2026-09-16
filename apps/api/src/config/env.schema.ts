import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  CORS_ORIGIN: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  GOOGLE_SECRET_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
