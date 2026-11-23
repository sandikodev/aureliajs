import { z } from 'zod';
import type {
  BillingInterval,
  Locale,
  Plan,
  ProjectStatus,
  Role,
  SubscriptionStatus,
} from './utils';

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

export const planSchema = z.enum(['free', 'pro', 'scale']);

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

export const billingIntervalSchema = z.enum(['monthly', 'yearly']);

export const subscriptionStatusSchema = z
  .enum(['none', 'trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'canceled', 'paused'])
  .default('none');

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

export const switchWorkspaceSchema = z.object({
  workspaceId: idSchema,
});
export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceSchema>;

/* ------------------------------------------------------------------ */
/* Workspaces                                                          */
/* ------------------------------------------------------------------ */

export const localeSchema = z.enum(['en', 'id']);

export const workspaceSettingsSchema = z.object({
  locale: localeSchema.default('en'),
  weeklyDigest: z.boolean().default(true),
});
export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: slugSchema.optional(),
  settings: workspaceSettingsSchema.partial().optional(),
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.optional(),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const workspaceSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  plan: planSchema,
  role: roleSchema,
  isActive: z.boolean(),
});
export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;

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

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const membersResponseSchema = z.object({
  members: z.array(memberSchema),
  seatLimit: z.number().int(),
  seatUsed: z.number().int(),
  memberCount: z.number().int(),
  pendingInvites: z.number().int(),
});
export type MembersResponse = z.infer<typeof membersResponseSchema>;

export const createInviteSchema = z.object({
  email: emailSchema,
  role: roleSchema.default('member'),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const revokeInviteQuerySchema = z
  .object({
    id: idSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => Boolean(data.id || data.email), {
    message: 'An email or an invitation id is required',
  });
export type RevokeInviteQuery = z.infer<typeof revokeInviteQuerySchema>;

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
/* Dashboard overview                                                 */
/* ------------------------------------------------------------------ */

export const overviewPeriodSchema = z.enum(['last-7', 'last-30', 'quarter']);
export type OverviewPeriod = z.infer<typeof overviewPeriodSchema>;

export const overviewQuerySchema = z.object({
  period: overviewPeriodSchema.default('last-30'),
});
export type OverviewQuery = z.infer<typeof overviewQuerySchema>;

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
  // Every real API error carries a request id for support tickets. It is
  // optional here because older/mocked responses may omit it.
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export type { BillingInterval, Locale, Plan, ProjectStatus, Role, SubscriptionStatus };
