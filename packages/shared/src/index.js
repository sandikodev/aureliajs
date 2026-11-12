import { z } from 'zod';
/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */
export const idSchema = z.string().min(1).max(64);
export const emailSchema = z.email().max(254).toLowerCase();
export const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes');
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).optional(),
});
export function paginated(item) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}
/* ------------------------------------------------------------------ */
/* Identity & tenancy                                                  */
/* ------------------------------------------------------------------ */
export const roleSchema = z.enum(['owner', 'admin', 'member']);
export const userSchema = z.object({
  id: idSchema,
  email: emailSchema,
  name: z.string().min(1).max(80),
  avatarUrl: z.url().nullable().default(null),
  createdAt: z.iso.datetime(),
});
export const sessionUserSchema = userSchema.extend({
  workspaceId: idSchema.nullable(),
  role: roleSchema.nullable(),
});
export const workspaceSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  slug: slugSchema,
  plan: z.enum(['free', 'pro']).default('free'),
  trialEndsAt: z.iso.datetime().nullable().default(null),
});
/* ------------------------------------------------------------------ */
/* Projects (the demo domain)                                          */
/* ------------------------------------------------------------------ */
export const projectStatusSchema = z.enum(['planning', 'active', 'paused', 'done']);
export const projectSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1).max(120),
  status: projectStatusSchema,
  budgetCents: z.number().int().min(0).max(1_000_000_000),
  dueDate: z.iso.date().nullable().default(null),
  ownerName: z.string().min(1).max(80),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const createProjectSchema = projectSchema
  .pick({ name: true, status: true, budgetCents: true, dueDate: true, ownerName: true })
  .extend({
    name: z.string().trim().min(2).max(120),
    budgetCents: z.number().int().min(0).max(1_000_000_000),
  });
export const updateProjectSchema = createProjectSchema.partial();
/* ------------------------------------------------------------------ */
/* Auth payloads                                                       */
/* ------------------------------------------------------------------ */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});
/**
 * Response shape for `GET /api/auth/me` and `POST /api/auth/login`.
 * `user === null` means "not signed in" and is intentionally a 200 so the
 * client can check auth state on boot without logging a 401 in the console.
 */
export const authSessionSchema = z.object({
  user: userSchema.nullable(),
  workspace: workspaceSchema.nullable(),
  role: roleSchema.nullable(),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(80),
  workspaceName: z.string().trim().min(1).max(80),
});
/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export const PROBLEM_STATUS = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation: 422,
  rate_limited: 429,
};
/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export function formatCents(cents, locale = 'en-US', currency = 'USD') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
export function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
//# sourceMappingURL=index.js.map
