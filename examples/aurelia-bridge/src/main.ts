import './init';
import Aurelia from 'aurelia';
import { BridgeConfiguration } from '@aureliajs/bridge';
import '@builder.io/qwik/qwikloader.js';
import { MyApp } from './my-app';

Aurelia
  .register(BridgeConfiguration)
  .app(MyApp)
  .start();
