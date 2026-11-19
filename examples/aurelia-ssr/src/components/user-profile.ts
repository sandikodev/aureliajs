import { customElement, bindable } from 'aurelia';
import template from './user-profile.html';

export interface UserData {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
}

@customElement({ name: 'user-profile', template })
export class UserProfile {
  @bindable public user: UserData = {
    id: 'u-1',
    name: 'Aurelia Architect',
    role: 'Staff Engineer',
    avatarUrl: '',
  };
}
