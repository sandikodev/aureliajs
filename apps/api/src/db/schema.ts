import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['owner', 'admin', 'member']);
export const projectStatusEnum = pgEnum('project_status', ['planning', 'active', 'paused', 'done']);
export const planEnum = pgEnum('plan', ['free', 'pro', 'scale']);

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt,
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    plan: planEnum('plan').default('free').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    /** Mirrors the Stripe subscription state; `none` means never subscribed. */
    subscriptionStatus: text('subscription_status').default('none').notNull(),
    /** End of the current billing period, used to show "renews on ...". */
    subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', {
      withTimezone: true,
    }),
    subscriptionCancelAtPeriodEnd: boolean('subscription_cancel_at_period_end')
      .default(false)
      .notNull(),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    createdAt,
  },
  (t) => [
    uniqueIndex('workspaces_slug_unique').on(t.slug),
    index('workspaces_stripe_customer_idx').on(t.stripeCustomerId),
  ],
);

export const memberships = pgTable(
  'memberships',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').default('member').notNull(),
    createdAt,
  },
  (t) => [uniqueIndex('memberships_workspace_user_unique').on(t.workspaceId, t.userId)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeWorkspaceId: uuid('active_workspace_id').references(() => workspaces.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt,
  },
  (t) => [uniqueIndex('sessions_token_hash_unique').on(t.tokenHash)],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: projectStatusEnum('status').default('planning').notNull(),
    budgetCents: integer('budget_cents').default(0).notNull(),
    dueDate: date('due_date'),
    ownerName: text('owner_name').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt,
    updatedAt,
  },
  (t) => [
    index('projects_workspace_idx').on(t.workspaceId),
    index('projects_workspace_status_idx').on(t.workspaceId, t.status),
  ],
);

export const invites = pgTable(
  'invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: roleEnum('role').default('member').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt,
  },
  (t) => [uniqueIndex('invites_token_hash_unique').on(t.tokenHash)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    actorName: text('actor_name').notNull(),
    action: text('action').notNull(),
    target: text('target').notNull(),
    createdAt,
  },
  (t) => [index('audit_logs_workspace_created_idx').on(t.workspaceId, t.createdAt)],
);

/**
 * Idempotency ledger for Stripe webhooks.
 *
 * Stripe delivers events at-least-once: the same `checkout.session.completed`
 * can arrive twice, and if we naively apply the plan change twice the audit
 * trail lies about what happened. The event id is the primary key, so the
 * insert itself is the dedupe — a second delivery hits a constraint violation
 * and we return 200 without re-applying the side effect.
 */
export const stripeEvents = pgTable(
  'stripe_events',
  {
    /** Stripe event id (`evt_...`). */
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, {
      onDelete: 'set null',
    }),
    /** Unix seconds when we processed it — handy when debugging a missed event. */
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('stripe_events_type_idx').on(t.type)],
);

export type UserRow = typeof users.$inferSelect;
export type WorkspaceRow = typeof workspaces.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
