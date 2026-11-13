import { existsSync } from 'node:fs';
import { z } from 'zod';

// Load the repo-root .env for local development without pulling in dotenv.
const rootEnvFile = new URL('../../../.env', import.meta.url);
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile.pathname);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4601),
  WEB_ORIGIN: z.string().default('http://localhost:4600'),
  DATABASE_URL: z.string().default('postgres://aureliajs:aureliajs@localhost:5544/aureliajs'),
  SESSION_SECRET: z.string().min(16).default('dev-only-change-me-32-characters-min'),
  /** Reported by /health so a deployment can be traced to a build. */
  APP_VERSION: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),
  STRIPE_PORTAL_CONFIGURATION_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
