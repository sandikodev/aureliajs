import type { FilterPattern } from '@rollup/pluginutils';

export interface AuxBlock {
  type: 'template' | 'script' | 'style';
  content: string;
  attrs: Record<string, string | boolean>;
  start: number;
  end: number;
  scoped?: boolean;
  lang?: string;
}

export interface AuxDescriptor {
  filename: string;
  template: AuxBlock | null;
  script: AuxBlock | null;
  styles: AuxBlock[];
  scopeId: string;
}

export interface AuxPluginOptions {
  /**
   * Files to include. Defaults to `/\.aux$/`.
   */
  include?: FilterPattern;
  /**
   * Files to exclude.
   */
  exclude?: FilterPattern;
  /**
   * Function to derive custom element tag name from file path.
   * By default, `button.aux` -> `ui-button` or `button`.
   */
  tagNameResolver?: (filename: string, className?: string) => string;
  /**
   * Default containerless setting for components without explicit configuration.
   */
  containerless?: boolean;
  /**
   * Shadow DOM mode ('open' | 'closed') if Shadow DOM is desired by default.
   */
  shadowOptions?: { mode: 'open' | 'closed' };
}
