import { customElement, resolve } from 'aurelia';
import type { Invite, Member, Role } from '@aureliajs/shared';
import template from './members-page.html';
import { api, ApiError } from '@/services/api';
import { AuthService } from '@/services/auth';

type InviteForm = {
  email: string;
  role: Role;
};

@customElement({ name: 'members-page', template })
export class MembersPage {
  private readonly auth = resolve(AuthService);

  members: Member[] = [];
  invites: Invite[] = [];

  seatLimit = 0;
  seatUsed = 0;

  invite: InviteForm = { email: '', role: 'member' };

  isLoading = true;
  isInviting = false;
  error = '';
  notice = '';
  /** The last invite link we created, so the owner can copy it. */
  lastInviteUrl = '';

  readonly roleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
    { value: 'owner', label: 'Owner' },
  ];

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

  async attached(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.error = '';
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
    } catch (cause) {
      this.error =
        cause instanceof ApiError ? cause.message : 'Could not load the team. Is the API running?';
      this.members = [];
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
    this.error = '';
    this.notice = '';
    this.lastInviteUrl = '';

    const email = this.invite.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.error = 'Enter a valid email address.';
      return;
    }

    this.isInviting = true;
    try {
      const { acceptUrl } = await api.createInvite({ email, role: this.invite.role });
      this.lastInviteUrl = acceptUrl;
      this.notice = `Invitation created for ${email}.`;
      this.invite = { email: '', role: 'member' };

      try {
        await navigator.clipboard.writeText(acceptUrl);
        this.notice += ' The accept link was copied to your clipboard.';
      } catch {
        // Clipboard access can be denied; the link is still shown below.
      }

      await this.load();
    } catch (cause) {
      this.error = cause instanceof ApiError ? cause.message : 'Could not create the invitation.';
    } finally {
      this.isInviting = false;
    }
  }

  async changeRole(member: Member, role: Role): Promise<void> {
    this.error = '';
    this.notice = '';

    if (role === member.role) return;

    try {
      await api.changeMemberRole(member.id, role);
      this.notice = `${member.name} is now ${this.roleLabel(role)}.`;
      await this.load();
    } catch (cause) {
      this.error = cause instanceof ApiError ? cause.message : 'Could not change that role.';
    }
  }

  async removeMember(member: Member): Promise<void> {
    this.error = '';
    this.notice = '';

    if (!confirm(`Remove ${member.name} from this workspace?`)) return;

    try {
      await api.removeMember(member.id);
      this.notice = `${member.name} was removed from the workspace.`;
      await this.load();
    } catch (cause) {
      this.error = cause instanceof ApiError ? cause.message : 'Could not remove that member.';
    }
  }

  roleLabel(role: Role): string {
    return role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member';
  }

  roleVariant(role: Role): 'default' | 'secondary' | 'outline' {
    return role === 'owner' ? 'default' : role === 'admin' ? 'secondary' : 'outline';
  }

  inviteStateLabel(state: Invite['state']): string {
    return state === 'pending' ? 'Pending' : state === 'accepted' ? 'Accepted' : 'Expired';
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
