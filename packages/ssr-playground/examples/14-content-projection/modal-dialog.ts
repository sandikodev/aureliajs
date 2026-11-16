import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'modal-dialog',
  template: './modal-dialog.html'
})
export class ModalDialog {
  @bindable dialogTitle = 'System Firmware Upgrade';
  @bindable badge = 'Release v2.0-rc2';
  @bindable dialogBody = 'Aurelia 2 SSR engine is synchronized with Hono Edge workers. All components render with zero hydration mismatches.';
}
