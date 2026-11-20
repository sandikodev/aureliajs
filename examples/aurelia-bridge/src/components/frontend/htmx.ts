import { customElement } from 'aurelia';
import template from './htmx.html';

/**
 * HTMX 2.0 Pure Hypermedia Component
 *
 * Demonstrates:
 * 1. Hypermedia Swapping: Uses `au-htmx` custom attribute to mount and process HTMX directives.
 * 2. Zero Client JS: Server HTML partials are swapped into the DOM target without Virtual DOM overhead.
 * 3. W3C HTTP/1.1 Standard: Operates purely through standard HTTP methods (`hx-get`).
 */
@customElement({
  name: 'htmx-card',
  template,
})
export class HtmxCard {}

export default HtmxCard;
