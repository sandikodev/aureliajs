import Aurelia from 'aurelia';
import { BridgeConfiguration } from '@aureliajs/bridge';
import '@builder.io/qwik/qwikloader.js';
(globalThis as any).qRuntimeQrl = true;
import { MyApp } from './my-app';

Aurelia
  .register(BridgeConfiguration)
  .app(MyApp)
  .start();
