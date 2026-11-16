import { customElement, bindable } from 'aurelia';

@customElement({
  name: 'telemetry-card',
  template: './telemetry-card.html'
})
export class TelemetryCard {
  @bindable serviceName = 'ITelemetryService [HonoEdgeTelemetry]';
  @bindable diScope = 'Container.Singleton';
  @bindable instanceCount = 1;
}
