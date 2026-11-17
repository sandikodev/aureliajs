/**
 * @aureliajs/islands - Type Definitions
 * Maintained by Sandikodev (https://github.com/sandikodev)
 */

export type IslandFramework = 'react' | 'vue' | 'svelte' | 'solid' | 'preact' | 'qwik' | (string & {});

export interface IslandMountContext<TProps = Record<string, any>> {
  container: HTMLElement;
  component: any;
  props: TProps;
  onUpdate?: (event: string, payload: any) => void;
}

export interface IslandInstance<TProps = Record<string, any>> {
  update(props: Partial<TProps>): void | Promise<void>;
  destroy(): void | Promise<void>;
  nativeInstance?: any;
}

export interface IslandAdapter<TProps = Record<string, any>> {
  readonly framework: IslandFramework;
  mount(context: IslandMountContext<TProps>): Promise<IslandInstance<TProps>> | IslandInstance<TProps>;
}

export interface IslandsPluginOptions {
  defaultFramework?: IslandFramework;
  customAdapters?: Record<string, IslandAdapter>;
}
