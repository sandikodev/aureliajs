import Aurelia from 'aurelia';
import { BridgeConfiguration } from '@aureliajs/bridge';
import { MyApp } from './my-app.js';

Aurelia
  .register(BridgeConfiguration)
  .app(MyApp)
  .start();
