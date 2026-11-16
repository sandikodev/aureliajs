import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'user-badge',
  template: './user-badge.html'
})
export class UserBadge {
  @bindable firstName = 'Sandiko';
  @bindable lastName = 'Dev';
  @bindable role = 'Principal Systems Architect';
  @bindable status = 'Verified Contributor';

  get fullName(): string {
    const f = this.firstName || '';
    const l = this.lastName || '';
    return (f + ' ' + l).trim() || 'Sandiko Dev';
  }

  get initials(): string {
    const f = this.firstName || 'S';
    const l = this.lastName || 'D';
    return (f.charAt(0) + l.charAt(0)).toUpperCase();
  }
}
