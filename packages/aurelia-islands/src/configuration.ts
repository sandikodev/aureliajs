/**
 * @aureliajs/islands - Plugin Configuration
 * Maintained by Sandikodev (https://github.com/sandikodev)
 */

import type { IContainer, IRegistry } from 'aurelia';
import { AureliaIsland } from './aurelia-island.js';
import type { IslandsPluginOptions } from './types.js';

export const IslandsConfiguration: IRegistry & {
  customize(options?: IslandsPluginOptions): IRegistry;
} = {
  register(container: IContainer): IContainer {
    return container.register(AureliaIsland);
  },
  customize(_options: IslandsPluginOptions = {}): IRegistry {
    return {
      register(container: IContainer): IContainer {
        return container.register(AureliaIsland);
      }
    };
  }
};
