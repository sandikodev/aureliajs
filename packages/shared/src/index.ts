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
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function paginated<T extends z.ZodType>(item: T) {
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
export type Role = z.infer<typeof roleSchema>;

export const userSchema = z.object({
  id: idSchema,
  email: emailSchema,
  name: z.string().min(1).max(80),
  avatarUrl: z.url().nullable().default(null),
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof userSchema>;

export const sessionUserSchema = userSchema.extend({
  workspaceId: idSchema.nullable(),
  role: roleSchema.nullable(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
/**
 * The three plan tiers. `free` is what a workspace gets before it ever
 * checks out; `pro` and `scale` are unlocked by a Stripe subscription.
 */
export const planSchema = z.enum(['free', 'pro', 'scale']);
export type Plan = z.infer<typeof planSchema>;

export const workspaceSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  slug: slugSchema,
  plan: planSchema,
  trialEndsAt: z.iso.datetime().nullable().default(null),
});
export type Workspace = z.infer<typeof workspaceSchema>;

/* ------------------------------------------------------------------ */
/* Billing                                                             */
/* ------------------------------------------------------------------ */

/** What each plan is allowed to do. The API enforces these, the UI renders them. */
export const PLAN_LIMITS: Record<Plan, { projects: number; seats: number }> = {
  free: { projects: 3, seats: 3 },
  pro: { projects: 5000, seats: 10 },
  scale: { projects: 50000, seats: 50 },
};

export const billingIntervalSchema = z.enum(['monthly', 'yearly']);
export type BillingInterval = z.infer<typeof billingIntervalSchema>;

/** Stripe subscription states we care about, mapped to what the UI shows. */
export const subscriptionStatusSchema = z
  .enum(['none', 'trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'canceled', 'paused'])
  .default('none');
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const checkoutRequestSchema = z.object({
  plan: z.enum(['pro', 'scale']),
  interval: billingIntervalSchema.default('monthly'),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const billingOverviewSchema = z.object({
  plan: planSchema,
  limits: z.object({ projects: z.number().int(), seats: z.number().int() }),
  usage: z.object({
    projects: z.number().int(),
    seats: z.number().int(),
  }),
  subscription: z.object({
    status: subscriptionStatusSchema,
    currentPeriodEnd: z.iso.datetime().nullable(),
    cancelAtPeriodEnd: z.boolean(),
  }),
  /** Which price ids are actually configured, so the UI can hide dead buttons. */
  availablePrices: z.object({
    monthly: z.boolean(),
    yearly: z.boolean(),
    scale: z.boolean(),
  }),
  invoices: z.array(
    z.object({
      id: z.string(),
      date: z.iso.datetime(),
      amountCents: z.number().int(),
      status: z.string(),
      invoiceUrl: z.string().nullable(),
    }),
  ),
});
export type BillingOverview = z.infer<typeof billingOverviewSchema>;

/* ------------------------------------------------------------------ */
/* Projects (the demo domain)                                          */
/* ------------------------------------------------------------------ */

export const projectStatusSchema = z.enum(['planning', 'active', 'paused', 'done']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

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
export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = projectSchema
  .pick({ name: true, status: true, budgetCents: true, dueDate: true, ownerName: true })
  .extend({
    name: z.string().trim().min(2).max(120),
    budgetCents: z.number().int().min(0).max(1_000_000_000),
  });
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/* ------------------------------------------------------------------ */
/* Auth payloads                                                       */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

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
export type AuthSession = z.infer<typeof authSessionSchema>;

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(80),
  workspaceName: z.string().trim().min(1).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/* ------------------------------------------------------------------ */
/* Team (members & invitations)                                        */
/* ------------------------------------------------------------------ */

export const memberSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  email: emailSchema,
  avatarUrl: z.url().nullable().default(null),
  role: roleSchema,
  status: z.enum(['active', 'invited']),
  joinedAt: z.iso.datetime(),
});
export type Member = z.infer<typeof memberSchema>;

export const membersResponseSchema = z.object({
  members: z.array(memberSchema),
  seatLimit: z.number().int(),
  seatUsed: z.number().int(),
});
export type MembersResponse = z.infer<typeof membersResponseSchema>;

export const createInviteSchema = z.object({
  email: emailSchema,
  role: roleSchema.default('member'),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const inviteSchema = z.object({
  id: idSchema,
  email: emailSchema,
  role: roleSchema,
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  acceptedAt: z.iso.datetime().nullable(),
  state: z.enum(['pending', 'accepted', 'expired']),
});
export type Invite = z.infer<typeof inviteSchema>;

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
export type ApiError = z.infer<typeof apiErrorSchema>;

export const PROBLEM_STATUS = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation: 422,
  rate_limited: 429,
} as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function formatCents(cents: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
