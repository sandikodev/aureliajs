/**
 * Sample Fixture: UserProfile
 * Demonstrates context injection (user, workspace, role) and whitelist security
 */

import { CustomElement } from 'aurelia';

export const UserProfile: unknown = CustomElement.define(
  {
    name: 'user-profile',
    template: `
      <div class="p-6 bg-card rounded-lg border shadow-sm space-y-3">
        <div class="flex items-center space-x-3">
          <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            \${user.name ? user.name[0] : 'U'}
          </div>
          <div>
            <h3 class="font-semibold text-foreground">\${user.name || 'Anonymous Guest'}</h3>
            <p class="text-xs text-muted-foreground">\${user.email || 'guest@example.com'}</p>
          </div>
        </div>
        <div class="pt-3 border-t flex justify-between text-xs text-muted-foreground">
          <span>Workspace: <strong class="text-foreground">\${workspace.name || 'Personal'}</strong></span>
          <span>Role: <strong class="text-foreground uppercase">\${role || 'Viewer'}</strong></span>
        </div>
      </div>
    `,
  },
  class {
    user: { name?: string; email?: string } = { name: 'Sandikodev', email: 'sandiko@example.com' };
    workspace: { name?: string } = { name: 'DeepMind Lab' };
    role = 'Architect';
  }
);
