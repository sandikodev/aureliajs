import { customElement, resolve } from 'aurelia';
import type { Invite, Member, Role } from '@aurelia-ops/shared';
import template from './members-page.html';
import { DEMO_MEMBERS } from '@/lib/demo-data';
import { api, ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';
import { I18nService } from '@/services/i18n';
import { ToastService } from '@/services/toast';

type InviteForm = {
  email: string;
  role: Role;
};

@customElement({ name: 'members-page', template })
export class MembersPage {
  private readonly auth = resolve(AuthService);
  readonly i18n = resolve(I18nService);
  readonly toast = resolve(ToastService);

  members: Member[] = [];
  invites: Invite[] = [];

  seatLimit = 0;
  seatUsed = 0;

  invite: InviteForm = { email: '', role: 'member' };

  isLoading = true;
  isInviting = false;
  /** The last invite link we created, so the owner can copy it. */
  lastInviteUrl = '';
  inviteModalEl!: HTMLDialogElement;
  invitedEmail = '';
  copied = false;
  private copyTimer: ReturnType<typeof setTimeout> | undefined;

  closeInviteModal(): void {
    this.inviteModalEl?.close();
  }

  async copyInviteLink(): Promise<void> {
    if (!this.lastInviteUrl) return;
    try {
      await navigator.clipboard.writeText(this.lastInviteUrl);
      this.copied = true;
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => {
        this.copied = false;
      }, 2000);
      this.toast.success(this.i18n.t('members.inviteCopied').trim());
    } catch {
      this.toast.error('Could not copy link to clipboard.');
    }
  }

  detaching(): void {
    clearTimeout(this.copyTimer);
  }

  readonly roleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
    { value: 'owner', label: 'Owner' },
  ];

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }

  /** "5 of 10 seats" */
  get seatsLabel(): string {
    this.i18n.track();
    return this.i18n.t('members.seats', { used: this.seatUsed, limit: this.seatLimit });
  }

  /** "5 used" */
  get seatsUsedLabel(): string {
    this.i18n.track();
    return this.i18n.t('members.seatsUsed', { used: this.seatUsed });
  }

  /** "10 total" */
  get seatsTotalLabel(): string {
    this.i18n.track();
    return this.i18n.t('members.seatsTotal', { limit: this.seatLimit });
  }

  get seatsStyle(): string {
    return `width: ${this.seatsPercent}%`;
  }

  get inviteModalSubtitle(): string {
    this.i18n.track();
    return this.copy['members.inviteModalSubtitle'] || 'Teammate invitation created';
  }

  get inviteModalDescription(): string {
    this.i18n.track();
    if (this.invitedEmail) {
      const prefix = this.copy['members.inviteFor'] || 'Share this link with';
      return `${prefix} ${this.invitedEmail}`;
    }
    return (
      this.copy['members.inviteModalDesc'] ||
      'Share this link with your teammate. Anyone with this link can join your workspace.'
    );
  }

  get copyButtonLabel(): string {
    this.i18n.track();
    return this.copied
      ? this.copy['members.copied'] || 'Copied'
      : this.copy['members.copy'] || 'Copy';
  }

  get modalCloseLabel(): string {
    this.i18n.track();
    return this.copy['members.close'] || 'Done';
  }

  selectInput(event: MouseEvent): void {
    const target = event.target as HTMLInputElement | null;
    target?.select();
  }

  /** The accessible name of a member's role dropdown. */
  changeRoleLabel(name: string): string {
    this.i18n.track();
    return this.i18n.t('members.changeRole', { name });
  }

  /** The accessible name of a member's remove button. */
  removeLabel(name: string): string {
    this.i18n.track();
    return this.i18n.t('members.remove', { name });
  }

  get canManage(): boolean {
    return this.auth.canManage;
  }

  get canInvite(): boolean {
    return this.auth.role === 'owner';
  }

  get seatsPercent(): number {
    if (this.seatLimit === 0) return 0;
    return Math.min(100, Math.round((this.seatUsed / this.seatLimit) * 100));
  }

  get pendingInvites(): Invite[] {
    return this.invites.filter((invite) => invite.state === 'pending');
  }

  /** True when every seat on the plan is taken (members + open invites). */
  get atSeatLimit(): boolean {
    return this.seatLimit > 0 && this.seatUsed >= this.seatLimit;
  }

  async attached(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    try {
      const [members, invites] = await Promise.all([
        api.members(),
        this.canInvite || this.auth.role === 'admin'
          ? api.listInvites().catch(() => [] as Invite[])
          : Promise.resolve([] as Invite[]),
      ]);

      this.members = members.members;
      this.seatLimit = members.seatLimit;
      this.seatUsed = members.seatUsed;
      this.invites = invites;
    } catch {
      this.members = DEMO_MEMBERS.members;
      this.seatLimit = DEMO_MEMBERS.seatLimit;
      this.seatUsed = DEMO_MEMBERS.seatUsed;
      this.invites = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Create an invitation and show the accept link.
   *
   * There is no mail server in this project, so the link is surfaced in the
   * UI and written to the clipboard. In production this would be the body of
   * an email and the token would never reach the browser.
   */
  async inviteMember(): Promise<void> {
    this.lastInviteUrl = '';

    const email = this.invite.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.toast.error('Enter a valid email address.');
      return;
    }

    this.isInviting = true;
    try {
      const { acceptUrl } = await api.createInvite({ email, role: this.invite.role });
      this.lastInviteUrl = acceptUrl;
      this.invitedEmail = email;
      this.copied = false;
      this.invite = { email: '', role: 'member' };

      try {
        await navigator.clipboard.writeText(acceptUrl);
        this.copied = true;
        this.copyTimer = setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch {
        // Clipboard access can be denied; modal allows manual copy
      }

      this.inviteModalEl?.showModal();
      await this.load();
    } catch (cause) {
      this.toast.error(cause instanceof ApiError ? cause.message : 'Could not create the invitation.');
    } finally {
      this.isInviting = false;
    }
  }

  async changeRole(member: Member, role: Role): Promise<void> {

    if (role === member.role) return;

    try {
      await api.changeMemberRole(member.id, role);
      this.toast.success(`${member.name} is now ${this.roleLabel(role)}.`);
      await this.load();
    } catch (cause) {
      this.toast.error(cause instanceof ApiError ? cause.message : 'Could not change that role.');
    }
  }

  async removeMember(member: Member): Promise<void> {

    if (!confirm(`Remove ${member.name} from this workspace?`)) return;

    try {
      await api.removeMember(member.id);
      this.toast.success(`${member.name} was removed from the workspace.`);
      await this.load();
    } catch (cause) {
      this.toast.error(cause instanceof ApiError ? cause.message : 'Could not remove that member.');
    }
  }

  revokeInviteLabel(email: string): string {
    this.i18n.track();
    return this.i18n.t('members.revokeInvite', { email });
  }

  async revokeInvite(invite: Invite): Promise<void> {
    if (!confirm(`Revoke invitation for ${invite.email}?`)) return;

    try {
      await api.revokeInvite(invite.id);
      this.toast.success(this.i18n.t('members.inviteRevoked', { email: invite.email }));
      await this.load();
    } catch (cause) {
      this.toast.error(cause instanceof ApiError ? cause.message : 'Could not revoke that invitation.');
    }
  }

  roleLabel(role: Role): string {
    this.i18n.track();
    const key = role === 'owner' ? 'role.owner' : role === 'admin' ? 'role.admin' : 'role.member';
    return this.i18n.t(key);
  }

  roleVariant(role: Role): 'default' | 'secondary' | 'outline' {
    return role === 'owner' ? 'default' : role === 'admin' ? 'secondary' : 'outline';
  }

  inviteStateLabel(state: Invite['state']): string {
    this.i18n.track();
    const key =
      state === 'pending'
        ? 'members.invitePending'
        : state === 'accepted'
          ? 'members.inviteAccepted'
          : 'members.inviteExpired';
    return this.i18n.t(key);
  }

  inviteStateVariant(state: Invite['state']): 'warning' | 'success' | 'outline' {
    return state === 'pending' ? 'warning' : state === 'accepted' ? 'success' : 'outline';
  }

  joined(member: Member): string {
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(member.joinedAt).getTime()) / 86_400_000),
    );
    if (days === 0) return 'joined today';
    if (days === 1) return 'joined yesterday';
    if (days < 30) return `joined ${days} days ago`;
    const months = Math.floor(days / 30);
    return `joined ${months} month${months === 1 ? '' : 's'} ago`;
  }

  expiresIn(invite: Invite): string {
    const hours = Math.floor((new Date(invite.expiresAt).getTime() - Date.now()) / 3_600_000);
    if (hours <= 0) return 'expired';
    if (hours < 24) return `expires in ${hours}h`;
    return `expires in ${Math.floor(hours / 24)}d`;
  }
}
