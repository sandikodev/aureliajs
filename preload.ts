/**
 * Bun runtime preload script for Aurelia 2 monorepo
 * Enables on-the-fly .aux Single File Component compilation in Bun
 */
import { plugin } from 'bun';
import { auxBunPlugin } from './packages/vite-plugin-aux/src/bun.js';

plugin(auxBunPlugin({ isServer: true }));
