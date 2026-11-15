import { singleton, observable } from 'aurelia';

type Mode = 'light' | 'dark';

const STORAGE_KEY = 'aurelia-ops-theme';

@singleton()
export class ThemeService {
  @observable mode: Mode = 'light';
  @observable isDark = false;

  constructor() {
    const stored = this.read();
    const prefersDark =
      typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(stored ?? (prefersDark ? 'dark' : 'light'), false);
  }

  get current(): Mode {
    return this.mode;
  }

  toggle(): Mode {
    this.apply(this.mode === 'dark' ? 'light' : 'dark');
    return this.mode;
  }

  private apply(mode: Mode, persist = true): void {
    this.mode = mode;
    this.isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* private mode — ignore */
      }
    }
  }

  private read(): Mode | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }
}
