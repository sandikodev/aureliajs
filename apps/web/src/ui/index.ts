import UiAlert from './alert.aux';
import UiAvatar from './avatar.aux';
import UiBadge from './badge.aux';
import UiButton from './button.aux';
import {
  UiCard,
  UiCardContent,
  UiCardDescription,
  UiCardFooter,
  UiCardHeader,
  UiCardTitle,
} from './card';
import UiIcon from './icon.aux';
import UiInput from './input.aux';
import UiLabel from './label.aux';
import UiSelect from './select.aux';
import UiSeparator from './separator.aux';
import UiSkeleton from './skeleton.aux';
import UiTextarea from './textarea.aux';
import UiToaster from './toaster.aux';

export {
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
  UiToaster,
};

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
  UiToaster,
];
