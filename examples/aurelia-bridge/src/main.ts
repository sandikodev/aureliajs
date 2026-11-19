import Aurelia from 'aurelia';
import { BridgeConfiguration } from '@aureliajs/bridge';
import { MyApp } from './my-app';

Aurelia
  .register(BridgeConfiguration)
  .app(MyApp)
  .start();
