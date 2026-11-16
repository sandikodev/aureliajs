import { customElement, bindable } from 'aurelia';

export interface UserContext {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceContext {
  id: string;
  name: string;
}

@customElement({
  name: 'user-profile',
  template: './user-profile.html'
})
export class UserProfile {
  // Context injected securely through Hono SSR RenderContext pipeline
  @bindable user: UserContext = { id: '', name: '', email: '' };
  @bindable workspace: WorkspaceContext = { id: '', name: '' };
  @bindable role = 'Viewer';
}
