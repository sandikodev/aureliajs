import { customElement, resolve } from 'aurelia';
import template from './not-found-page.html';
import { I18nService } from '@/services/i18n';

@customElement({ name: 'not-found-page', template })
export class NotFoundPage {
  readonly i18n = resolve(I18nService);

  /** The message catalog — see the note on `App.copy`. */
  get copy() {
    this.i18n.track();
    return this.i18n.strings;
  }
}
