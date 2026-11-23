# RFC: Eliminate React-Centric CSS Utilities (`cva`, `clsx`, `tailwind-merge`) in Favor of Aurelia 2 Native Bindings

**Status:** 📝 Proposed / Under Community Review  
**Area:** `apps/web`  
**Tags:** `native`, `yagni`, `framework-identity`

---

## 1. Problem Statement

In `apps/web`, three external packages are installed:
- `class-variance-authority` (cva)
- `clsx`
- `tailwind-merge`

These are currently used in exactly three components (`alert.aux`, `button.aux`, `badge.aux`) and one utility file (`apps/web/src/lib/utils.ts`):

```ts
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils'; // twMerge(clsx(inputs))
```

### Why is this an anti-pattern in Aurelia 2?
1. **React Mental Model Leaking into Aurelia**: `clsx` and `cva` were invented to compensate for React's lack of first-class template class binding directives.
2. **Tailwind v4 Native Capabilities**: In Tailwind CSS v4 (`@tailwindcss/vite: 4.3.5`), utilities cascade cleanly, reducing the need for class conflict resolution engines like `tailwind-merge`.
3. **Runtime Overhead**: Every component render parses arrays of strings, builds ASTs of class names, and compares them with regex, wasting CPU cycles on simple static buttons and badges.

---

## 2. Proposed Migration

### A. Component ViewModels: Use Clean TypeScript Dictionaries
Instead of `cva(...)`:

```ts
// apps/web/src/ui/badge.aux
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const VARIANT_MAP: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20',
  outline: 'text-foreground',
  success: 'border-transparent bg-success/10 text-success dark:bg-success/20 dark:text-emerald-300',
  warning: 'border-transparent bg-warning/15 text-amber-800 dark:bg-warning/20 dark:text-amber-200',
};

get classes(): string {
  return `inline-flex items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 ${VARIANT_MAP[this.variant] ?? VARIANT_MAP.default}`;
}
```

### B. Template Binding: Leverage Aurelia Directives
In Aurelia templates, class binding is native and declarative:

```html
<button class="btn btn-${variant} ${size} ${disabled ? 'opacity-50' : ''}">
  <au-slot></au-slot>
</button>
```

---

## 3. Benefits & Metrics

- **Dependencies Removed**: 3 npm packages (`class-variance-authority`, `clsx`, `tailwind-merge`).
- **Bundle Savings**: ~18 KB minified JS eliminated from client bundle.
- **Execution Speed**: Instant $O(1)$ property lookup instead of multi-step string tokenization.
- **Framework Ergonomics**: Adheres to Aurelia 2's core philosophy of Direct-DOM and Convention-over-Configuration.

---

## 4. Community Debate & Trade-offs

- **Pros:**
  - Authentic Aurelia 2 syntax without shadcn/React boilerplate.
  - Zero dependencies for simple design tokens.
- **Potential Concerns:**
  - *What about developers accustomed to copy-pasting components from shadcn/ui?*
    - *Resolution*: Aurelia's syntax is simpler and more legible than JSX string gymnastics. Documenting clean `.aux` component recipes gives Aurelia developers far better ergonomics.

---

## 5. Rollback Plan

If developers strongly prefer the shadcn/cva DX:
1. Retain a lightweight pure-JS `cn(...classes)` helper without `tailwind-merge`:
   ```ts
   export const cn = (...classes: unknown[]) => classes.flat().filter(Boolean).join(' ');
   ```
2. Re-install `class-variance-authority` only if complex variant combinations (>4 axes) are required.
