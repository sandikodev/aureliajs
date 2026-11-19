import type { ProjectStatus } from '@aurelia-ops/shared';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

/**
 * Presentation metadata for a project status.
 *
 * The `label` is the English fallback: it is what the API stores and what
 * the shared status enum means. The UI overrides it with the translated
 * label from the message catalog, so the badge reads correctly in every
 * language without the enum having to know about i18n.
 */
export const STATUS_META: Record<
  ProjectStatus,
  { label: string; variant: BadgeVariant; dot: string }
> = {
  planning: { label: 'Planning', variant: 'outline', dot: 'bg-muted-foreground' },
  active: { label: 'Active', variant: 'success', dot: 'bg-emerald-500' },
  paused: { label: 'Paused', variant: 'warning', dot: 'bg-amber-500' },
  done: { label: 'Done', variant: 'secondary', dot: 'bg-muted-foreground' },
};

export const STATUS_OPTIONS: Array<{ value: ProjectStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'planning', label: 'Planning' },
  { value: 'paused', label: 'Paused' },
  { value: 'done', label: 'Done' },
];

export function statusMeta(status: ProjectStatus) {
  return STATUS_META[status];
}
