import { valueConverter } from 'aurelia';

@valueConverter('formatNumber')
export class FormatNumberValueConverter {
  toView(value: number): string {
    return Number(value || 0).toLocaleString('en-US');
  }
}
