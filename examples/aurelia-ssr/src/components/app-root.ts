import { customElement, bindable } from 'aurelia';
import template from './app-root.html';
import { CounterWidget } from './counter-widget';
import { UserProfile, type UserData } from './user-profile';

@customElement({
  name: 'app-root',
  template,
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
