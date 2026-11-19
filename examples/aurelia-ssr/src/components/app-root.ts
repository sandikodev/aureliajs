import { customElement, bindable } from 'aurelia';
import template from './app-root.html';
import { CounterWidget } from './counter-widget.js';
import { UserProfile, type UserData } from './user-profile.js';

@customElement({
  name: 'app-root',
  template: template as unknown as string,
  dependencies: [CounterWidget, UserProfile],
})
export class AppRoot {
  @bindable public title = 'Pure Aurelia 2 SSR Engine';
  @bindable public serverTime = '';
  @bindable public currentUser: UserData = {
    id: 'usr-42',
    name: 'Sandikodev',
    role: 'Framework Maintainer',
    avatarUrl: '',
  };
  @bindable public initialCount = 10;
}
