import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'form-controls',
  template: './form-controls.html'
})
export class FormControls {
  @bindable username = 'Sandikodev';
  @bindable framework = 'Aurelia 2 SSR';
  @bindable isActive = true;

  toggleStatus() {
    this.isActive = !this.isActive;
  }
}
