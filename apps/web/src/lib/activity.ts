import type { I18nService, MessageKey } from '@/services/i18n';

/**
 * API audit-trail action → message key.
 *
 * There is one mapping for the whole app so the shell notification feed and
 * the overview activity list can never disagree. Adding an action means one
 * API verb and one catalog key; no component carries English copy.
 */
export const ACTION_KEYS: Readonly<Record<string, MessageKey>> = {
  'project.created': 'activity.projectCreated',
  'project.updated': 'activity.projectUpdated',
  'project.deleted': 'activity.projectDeleted',
  'project.status_changed': 'activity.projectStatusChanged',
  'member.invited': 'activity.memberInvited',
  'member.invite_accepted': 'activity.memberInviteAccepted',
  'member.invite_revoked': 'activity.memberInviteRevoked',
  'member.role_changed': 'activity.memberRoleChanged',
  'member.removed': 'activity.memberRemoved',
  'billing.checkout_started': 'activity.billingCheckoutStarted',
  'billing.plan_activated': 'activity.billingPlanActivated',
  'billing.plan_changed': 'activity.billingPlanChanged',
  'billing.invoice_paid': 'activity.billingInvoicePaid',
  'billing.invoice_failed': 'activity.billingInvoiceFailed',
  'workspace.updated': 'activity.workspaceUpdated',
  'workspace.created': 'activity.workspaceCreated',
};

/** Translate an audit action; unknown actions are shown verbatim. */
export function actionLabel(i18n: I18nService, action: string): string {
  i18n.track();
  const key = ACTION_KEYS[action];
  return key ? i18n.t(key) : action;
}
