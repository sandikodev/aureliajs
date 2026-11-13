import { UiAvatar } from './avatar';
import { UiAlert } from './alert';
import { UiBadge } from './badge';
import { UiButton } from './button';
import {
  UiCard,
  UiCardContent,
  UiCardDescription,
  UiCardFooter,
  UiCardHeader,
  UiCardTitle,
} from './card';
import { UiIcon } from './icon';
import { UiInput } from './input';
import { UiLabel } from './label';
import { UiSelect } from './select';
import { UiSeparator } from './separator';
import { UiSkeleton } from './skeleton';
import { UiTextarea } from './textarea';
import { UiThemeToggle } from './theme-toggle';
import { UiToaster } from './toaster';

/** Every primitive is globally registered so templates stay dependency-free. */
export const UI = [
  UiAlert,
  UiAvatar,
  UiBadge,
  UiButton,
  UiCard,
  UiCardContent,
  UiCardDescription,
  UiCardFooter,
  UiCardHeader,
  UiCardTitle,
  UiIcon,
  UiInput,
  UiLabel,
  UiSelect,
  UiSeparator,
  UiSkeleton,
  UiTextarea,
  UiThemeToggle,
  UiToaster,
];
