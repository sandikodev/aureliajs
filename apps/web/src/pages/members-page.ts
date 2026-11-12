import { customElement } from 'aurelia';
import template from './members-page.html';
import { emailSchema, type Role } from '@aureliajs/shared';
import { relativeTime } from '@/lib/utils';

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited';
  joinedAt: string;
};

const iso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

@customElement({ name: 'members-page', template })
export class MembersPage {
  members: MemberRow[] = [
    {
      id: 'm1',
      name: 'Demo Operator',
      email: 'demo@aureliajs.dev',
      role: 'owner',
      status: 'active',
      joinedAt: iso(180),
    },
    {
      id: 'm2',
      name: 'Ayu Prameswari',
      email: 'ayu@northwind.test',
      role: 'admin',
      status: 'active',
      joinedAt: iso(120),
    },
    {
      id: 'm3',
      name: 'Daniel Okafor',
      email: 'daniel@northwind.test',
      role: 'member',
      status: 'active',
      joinedAt: iso(54),
    },
    {
      id: 'm4',
      name: 'Mira Sørensen',
      email: 'mira@northwind.test',
      role: 'member',
      status: 'active',
      joinedAt: iso(21),
    },
    {
      id: 'm5',
      name: 'Kenji Watanabe',
      email: 'kenji@northwind.test',
      role: 'member',
      status: 'invited',
      joinedAt: iso(2),
    },
  ];

  invite = { email: '', role: 'member' as Role };
  error = '';
  notice = '';

  readonly roleOptions = [
    { value: 'member', label: 'Member — can edit projects' },
    { value: 'admin', label: 'Admin — can manage members' },
  ];

  get seatsUsed(): number {
    return this.members.length;
  }

  get seatsLimit(): number {
    return 10;
  }

  get seatsPercent(): number {
    return Math.round((this.seatsUsed / this.seatsLimit) * 100);
  }

  inviteMember(): void {
    this.error = '';
    this.notice = '';
    const parsed = emailSchema.safeParse(this.invite.email);
    if (!parsed.success) {
      this.error = 'Enter a valid work email address.';
      return;
    }
    if (this.members.some((member) => member.email === parsed.data)) {
      this.error = 'That person is already in this workspace.';
      return;
    }
    this.members = [
      ...this.members,
      {
        id: `local-${Date.now()}`,
        name: parsed.data.split('@')[0] ?? parsed.data,
        email: parsed.data,
        role: this.invite.role,
        status: 'invited',
        joinedAt: new Date().toISOString(),
      },
    ];
    this.notice = `Invite queued for ${parsed.data}. Email delivery lands in M1.`;
    this.invite = { email: '', role: 'member' };
  }

  joined(member: MemberRow): string {
    return member.status === 'invited'
      ? `invited ${relativeTime(member.joinedAt)}`
      : `joined ${relativeTime(member.joinedAt)}`;
  }

  roleLabel(role: Role): string {
    return role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member';
  }

  roleVariant(role: Role): 'default' | 'secondary' | 'outline' {
    return role === 'owner' ? 'default' : role === 'admin' ? 'secondary' : 'outline';
  }
}
