import { createProjectSchema, type Project } from '@aureliajs/shared/schemas';
import { formatCents, type ProjectStatus } from '@aureliajs/shared/utils';
import { customElement, resolve } from 'aurelia';
import type { IRouteViewModel, Params } from '@aurelia/router';
import template from './projects-page.html';
import { DEMO_PROJECTS } from '@/lib/demo-data';
import { STATUS_META } from '@/lib/status';
import { formatDate, relativeTime } from '@/lib/utils';
import { api, ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';
import { ToastService } from '@/services/toast';

type FormState = {
  name: string;
  ownerName: string;
  status: ProjectStatus;
  budget: string;
  dueDate: string;
};

const emptyForm = (): FormState => ({
  name: '',
  ownerName: '',
  status: 'planning',
  budget: '',
  dueDate: '',
});

@customElement({ name: 'projects-page', template })
export class ProjectsPage implements IRouteViewModel {
  dialogEl!: HTMLDialogElement;
  readonly auth = resolve(AuthService);
  readonly i18n = resolve(I18nService);
  readonly toast = resolve(ToastService);

  /**
   * The translator, exposed through a view-model getter so the binding
   * re-evaluates when the locale changes.
   */
  get t() {
    // Read the locale inside this observed getter so the binding is
    // registered as a dependency of it.
    this.i18n.track();
    return this.i18n.t;
  }

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  /** The page subtitle, with the project count interpolated. */
  get subtitleText(): string {
    this.i18n.track();
    return this.i18n.t('projects.subtitle', { count: this.total });
  }

  /** "Showing 1–10 of 84" */
  get showingLabel(): string {
    this.i18n.track();
    return this.i18n.t('projects.showing', {
      from: this.rangeStart,
      to: this.rangeEnd,
      total: this.total,
    });
  }

  /**
   * The status metadata, with the label taken from the message catalog.
   *
   * The variant and the dot colour are presentation, not copy, so they stay
   * in the shared module; only the label is translated.
   */
  get statusMeta() {
    this.i18n.track();
    return Object.fromEntries(
      (Object.keys(STATUS_META) as ProjectStatus[]).map((status) => [
        status,
        { ...STATUS_META[status], label: this.i18n.t(`status.${status}` as never) },
      ]),
    ) as Record<ProjectStatus, { label: string; variant: string; dot: string }>;
  }

  /** The status labels for the filter and the dialog, from the catalog. */
  get statusOptions(): { value: ProjectStatus; label: string }[] {
    this.i18n.track();
    return (['planning', 'active', 'paused', 'done'] as ProjectStatus[]).map((value) => ({
      value,
      label: this.i18n.t(`status.${value}` as never),
    }));
  }

  /** The same list for the create/edit dialog. */
  get dialogStatusOptions(): { value: ProjectStatus; label: string }[] {
    return this.statusOptions;
  }

  get sortOptions(): { value: 'updated' | 'budget' | 'name'; label: string }[] {
    this.i18n.track();
    return (
      [
        { value: 'updated', key: 'sort.updated' },
        { value: 'budget', key: 'sort.budget' },
        { value: 'name', key: 'sort.name' },
      ] as const
    ).map((option) => ({ value: option.value, label: this.i18n.t(option.key) }));
  }

  /** "New project" / "Edit project" */
  get dialogTitle(): string {
    this.i18n.track();
    return this.isEditing ? this.i18n.t('projects.dialogEdit') : this.i18n.t('projects.dialogNew');
  }

  /** A success or error notice, in the current language. */
  private notifySuccess(
    key: 'projects.created' | 'projects.updated' | 'projects.deleted',
    name: string,
  ): void {
    this.i18n.track();
    this.toast.success(this.i18n.t(key, { name }));
  }

  private notifySuccessLocal(
    key: 'projects.createdLocal' | 'projects.updatedLocal' | 'projects.deletedLocal',
  ): void {
    this.i18n.track();
    this.toast.success(this.i18n.t(key));
  }

  items: Project[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  readonly pageSizes = [10, 25, 50];

  q = '';
  status: ProjectStatus | '' = '';
  sort: 'updated' | 'budget' | 'name' = 'updated';

  isLoading = true;
  demo = false;
  saving = false;

  editingId: string | null = null;
  form: FormState = emptyForm();
  fieldErrors: Record<string, string> = {};

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get canPrev(): boolean {
    return this.page > 1 && !this.isLoading;
  }

  get canNext(): boolean {
    return this.page < this.totalPages && !this.isLoading;
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  private shouldOpenNew = false;

  loading(params: Params): void {
    const isNew = params?.new === 'true' || params?.new === '1';
    if (isNew) {
      this.shouldOpenNew = true;
    }
  }

  async attached(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) this.q = q;
    if (this.shouldOpenNew || params.get('new') === 'true' || params.get('new') === '1') {
      this.shouldOpenNew = false;
      this.openCreate();
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('new');
      window.history.replaceState({}, '', cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ''));
    }
    await this.load();
  }

  detaching(): void {
    clearTimeout(this.searchTimer);
  }

  async load(): Promise<void> {
    this.isLoading = true;
    try {
      const result = await api.listProjects({
        page: this.page,
        pageSize: this.pageSize,
        q: this.q,
        status: this.status,
        sort: this.sort,
      });
      this.items = result.items;
      this.total = result.total;
      this.demo = false;
    } catch {
      this.loadLocal();
      this.demo = true;
    } finally {
      this.isLoading = false;
    }
  }

  private loadLocal(): void {
    let rows = [...DEMO_PROJECTS];
    if (this.q) {
      const needle = this.q.toLowerCase();
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.ownerName.toLowerCase().includes(needle),
      );
    }
    if (this.status) rows = rows.filter((p) => p.status === this.status);
    rows.sort((a, b) => {
      if (this.sort === 'budget') return b.budgetCents - a.budgetCents;
      if (this.sort === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    this.total = rows.length;
    const maxPage = Math.max(1, Math.ceil(rows.length / this.pageSize));
    if (this.page > maxPage) this.page = maxPage;
    this.items = rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page = 1;
      void this.load();
    }, 300);
  }

  onFilterChange(): void {
    this.page = 1;
    void this.load();
  }

  resetFilters(): void {
    this.q = '';
    this.status = '';
    this.sort = 'updated';
    this.page = 1;
    void this.load();
  }

  goToPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages);
    if (next === this.page) return;
    this.page = next;
    void this.load();
  }

  openCreate(): void {
    this.editingId = null;
    this.form = emptyForm();
    this.fieldErrors = {};
    this.dialogEl.showModal();
  }

  openEdit(project: Project): void {
    this.editingId = project.id;
    this.form = {
      name: project.name,
      ownerName: project.ownerName,
      status: project.status,
      budget: (project.budgetCents / 100).toFixed(0),
      dueDate: project.dueDate ?? '',
    };
    this.fieldErrors = {};
    this.dialogEl.showModal();
  }

  closeDialog(): void {
    this.dialogEl.close();
  }

  async save(): Promise<void> {
    this.fieldErrors = {};
    const budgetNumber = Number(this.form.budget === '' ? 0 : this.form.budget);

    const parsed = createProjectSchema.safeParse({
      name: this.form.name,
      ownerName: this.form.ownerName,
      status: this.form.status,
      budgetCents: Number.isFinite(budgetNumber) ? Math.round(budgetNumber * 100) : -1,
      dueDate: this.form.dueDate ? this.form.dueDate : null,
    });

    if (!parsed.success) {
      this.fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.map(String).join('.'), issue.message]),
      );
      return;
    }

    this.saving = true;
    try {
      if (this.isEditing && this.editingId) {
        const { project } = await api.updateProject(this.editingId, parsed.data);
        this.items = this.items.map((row) => (row.id === project.id ? project : row));
        this.notifySuccess('projects.updated', project.name);
      } else {
        const { project } = await api.createProject(parsed.data);
        this.notifySuccess('projects.created', project.name);
        await this.load();
      }
      this.dialogEl.close();
    } catch (error) {
      if (this.demo) {
        this.applyLocalMutation(parsed.data);
        this.notifySuccessLocal(this.isEditing ? 'projects.updatedLocal' : 'projects.createdLocal');
        this.dialogEl.close();
      } else if (error instanceof ApiError) {
        this.toast.error(error.message);
        if (error.issues.length > 0) {
          this.fieldErrors = Object.fromEntries(error.issues.map((i) => [i.path, i.message]));
        }
      } else {
        this.toast.error('Could not save the project.');
      }
    } finally {
      this.saving = false;
    }
  }

  private applyLocalMutation(input: {
    name: string;
    status: ProjectStatus;
    budgetCents: number;
    dueDate: string | null;
    ownerName: string;
  }): void {
    const now = new Date().toISOString();
    if (this.isEditing && this.editingId) {
      this.items = this.items.map((row) =>
        row.id === this.editingId ? { ...row, ...input, updatedAt: now } : row,
      );
    } else {
      const project: Project = {
        id: `local-${Date.now()}`,
        workspaceId: 'demo-workspace',
        createdAt: now,
        updatedAt: now,
        ...input,
      };
      this.items = [project, ...this.items].slice(0, this.pageSize);
      this.total += 1;
    }
  }

  async remove(project: Project): Promise<void> {
    if (!confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    try {
      await api.deleteProject(project.id);
      this.notifySuccess('projects.deleted', project.name);
      await this.load();
    } catch {
      this.items = this.items.filter((row) => row.id !== project.id);
      this.total = Math.max(0, this.total - 1);
      this.demo = true;
      this.notifySuccessLocal('projects.deletedLocal');
    }
  }

  budget(project: Project): string {
    return formatCents(project.budgetCents);
  }

  due(project: Project): string {
    return formatDate(project.dueDate);
  }

  updated(project: Project): string {
    return relativeTime(project.updatedAt);
  }

  isOverdue(project: Project): boolean {
    if (!project.dueDate || project.status === 'done') return false;
    return project.dueDate < new Date().toISOString().slice(0, 10);
  }

  exportCsv(): void {
    const header = ['Name', 'Status', 'Owner', 'Budget (USD)', 'Due date', 'Updated'];
    const rows = this.items.map((p) => [
      p.name,
      this.statusMeta[p.status].label,
      p.ownerName,
      (p.budgetCents / 100).toFixed(2),
      p.dueDate ?? '',
      p.updatedAt,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `projects-page-${this.page}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.i18n.track();
    this.toast.success(this.i18n.t('projects.exportDone'));
  }
}
