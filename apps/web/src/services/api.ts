import type {
  AuthSession,
  BillingOverview,
  CreateInviteInput,
  CreateProjectInput,
  CreateWorkspaceInput,
  Invite,
  LoginInput,
  MembersResponse,
  Project,
  ProjectStatus,
  Role,
  UpdateProjectInput,
  UpdateWorkspaceInput,
  WorkspaceSummary,
} from '@aurelia-ops/shared';

export type OverviewStats = {
  total: number;
  active: number;
  planning: number;
  paused: number;
  done: number;
  overdue: number;
  members: number;
  budgetCents: number;
};

export type ActivityItem = {
  id: string;
  actorName: string;
  action: string;
  target: string;
  createdAt: string;
};

export type Period = 'last-7' | 'last-30' | 'quarter';

export type Overview = {
  period: Period;
  periodDays: number;
  stats: OverviewStats;
  /** Projects created per month, oldest first. */
  trend: { month: string; value: number }[];
  activity: ActivityItem[];
};

export type WorkspaceList = {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string;
};

export type CurrentWorkspace = {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'scale';
  role: Role;
  settings: { locale: 'en' | 'id'; weeklyDigest: boolean };
};

export type PaginatedProjects = {
  items: Project[];
  page: number;
  pageSize: number;
  total: number;
};

export type ProjectQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: ProjectStatus | '';
  sort?: 'updated' | 'budget' | 'name';
};

export type ApiIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

let onUnauthorized: (() => void) | null = null;

/** Register the redirect-to-login behaviour once, from the app root. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(8000),
      ...init,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(0, 'timeout', 'The request timed out. Please try again.');
    }
    throw new ApiError(0, 'network_error', 'The API is unreachable');
  }

  if (response.status === 204) return undefined as unknown as T;

  const payload = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string; issues?: ApiIssue[] };
  } | null;

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      onUnauthorized?.();
    }
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'request_failed',
      payload?.error?.message ?? `Request failed (${response.status})`,
      payload?.error?.issues ?? [],
    );
  }

  return payload as T;
}

export const api = {
  overview: (period: Period = 'last-30') => request<Overview>(`/api/overview?period=${period}`),

  listProjects: (query: ProjectQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.q) params.set('q', query.q);
    if (query.status) params.set('status', query.status);
    if (query.sort) params.set('sort', query.sort);
    const qs = params.toString();
    return request<PaginatedProjects>(`/api/projects${qs ? `?${qs}` : ''}`);
  },

  createProject: (input: CreateProjectInput) =>
    request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProject: (id: string, input: UpdateProjectInput) =>
    request<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteProject: (id: string) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  health: () => request<{ ok: boolean; db: 'up' | 'down' }>('/health'),

  /* Auth — `me` returns 200 with nulls when signed out, so the boot check
     does not create a 401 in the browser console. */
  me: () => request<AuthSession>('/api/auth/me'),

  login: (input: LoginInput) =>
    request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  /* Billing — Stripe Checkout runs on Stripe's hosted page, so the API only
     hands back a URL and the browser follows it. */
  billing: () => request<BillingOverview>('/api/billing'),

  startCheckout: (plan: 'pro' | 'scale', interval: 'monthly' | 'yearly') =>
    request<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, interval }),
    }),

  openPortal: () => request<{ url: string }>('/api/billing/portal', { method: 'POST' }),

  /* Team */
  members: () => request<MembersResponse>('/api/members'),

  createInvite: (input: CreateInviteInput) =>
    request<{ invite: Invite; acceptUrl: string }>('/api/invites', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listInvites: () => request<Invite[]>('/api/invites'),

  revokeInvite: (id: string) =>
    request<void>(`/api/invites?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  acceptInvite: (token: string) =>
    request<AuthSession>('/api/invites/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  changeMemberRole: (userId: string, role: Role) =>
    request<{ ok: boolean; role: Role }>(`/api/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (userId: string) => request<void>(`/api/members/${userId}`, { method: 'DELETE' }),

  /* Workspaces */
  workspaces: () => request<WorkspaceList>('/api/workspaces'),

  currentWorkspace: () => request<CurrentWorkspace>('/api/workspaces/current'),

  updateWorkspace: (input: UpdateWorkspaceInput) =>
    request<CurrentWorkspace>('/api/workspaces/current', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  createWorkspace: (input: CreateWorkspaceInput) =>
    request<{ workspace: WorkspaceSummary }>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteWorkspace: () => request<void>('/api/workspaces/current', { method: 'DELETE' }),

  switchWorkspace: (workspaceId: string) =>
    request<AuthSession>('/api/auth/switch-workspace', {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    }),
};
