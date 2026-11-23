import { createProjectSchema, type Project } from '@aurelia-ops/shared/schemas';
import type { ProjectStatus } from '@aurelia-ops/shared/utils';
import { customElement, INode, resolve } from 'aurelia';
import template from './project-dialog.html';
import { api, ApiError } from '@/services/api';
import { I18nService } from '@/services/i18n';
import { ToastService } from '@/services/toast';

export type ProjectFormState = {
  name: string;
  ownerName: string;
  status: ProjectStatus;
  budget: string;
  dueDate: string;
};

export type ProjectSavedDetail = {
  project?: Project;
  isEdit: boolean;
  input: {
    name: string;
    status: ProjectStatus;
    budgetCents: number;
    dueDate: string | null;
    ownerName: string;
  };
};

type StatusKey = `status.${ProjectStatus}`;

const emptyForm = (): ProjectFormState => ({
  name: '',
  ownerName: '',
  status: 'planning',
  budget: '',
  dueDate: '',
});

@customElement({ name: 'project-dialog', template })
export class ProjectDialog {
  dialogEl!: HTMLDialogElement;
  private readonly element = resolve(INode) as HTMLElement;
  private readonly i18n = resolve(I18nService);
  private readonly toast = resolve(ToastService);

  editingId: string | null = null;
  form: ProjectFormState = emptyForm();
  fieldErrors: Record<string, string> = {};
  formError = '';
  saving = false;

  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  get isPlanLimit(): boolean {
    return (
      this.formError.toLowerCase().includes('plan') ||
      this.formError.toLowerCase().includes('limit') ||
      this.formError.toLowerCase().includes('seat')
    );
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  get dialogTitle(): string {
    this.i18n.track();
    return this.isEditing ? this.i18n.t('projects.dialogEdit') : this.i18n.t('projects.dialogNew');
  }

  get statusOptions(): { value: ProjectStatus; label: string }[] {
    this.i18n.track();
    return (['planning', 'active', 'paused', 'done'] as ProjectStatus[]).map((value) => {
      const key: StatusKey = `status.${value}`;
      return {
        value,
        label: this.i18n.t(key),
      };
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = emptyForm();
    this.fieldErrors = {};
    this.formError = '';
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
    this.formError = '';
    this.dialogEl.showModal();
  }

  close(): void {
    this.dialogEl.close();
  }

  async save(): Promise<void> {
    this.fieldErrors = {};
    this.formError = '';
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
        this.notifySuccess('projects.updated', project.name);
        this.dispatchSaved({ project, isEdit: true, input: parsed.data });
      } else {
        const { project } = await api.createProject(parsed.data);
        this.notifySuccess('projects.created', project.name);
        this.dispatchSaved({ project, isEdit: false, input: parsed.data });
      }
      this.dialogEl.close();
    } catch (error) {
      if (error instanceof ApiError) {
        this.formError = error.message;
        if (error.issues.length > 0) {
          this.fieldErrors = Object.fromEntries(error.issues.map((i) => [i.path, i.message]));
        }
      } else {
        // Fallback for demo/offline: dispatch to parent to apply local mutation
        this.dispatchSaved({ isEdit: this.isEditing, input: parsed.data });
        this.dialogEl.close();
      }
    } finally {
      this.saving = false;
    }
  }

  private dispatchSaved(detail: ProjectSavedDetail): void {
    this.element.dispatchEvent(
      new CustomEvent('saved', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  private notifySuccess(
    key: 'projects.created' | 'projects.updated',
    name: string,
  ): void {
    this.i18n.track();
    this.toast.success(this.i18n.t(key, { name }));
  }
}
