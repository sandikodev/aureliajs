import { describe, it, expect } from 'bun:test';
import { CustomElement } from 'aurelia';
import { HomePage } from '../src/pages/home.aux';
import { DashboardPage } from '../src/pages/dashboard.aux';
import { IslandsPage } from '../src/pages/islands.aux';

describe('examples/aurelia-aux integration tests', () => {
  it('compiles HomePage as a valid Aurelia 2 CustomElement with static server loader metadata', () => {
    expect(CustomElement.isType(HomePage)).toBe(true);
    const def = CustomElement.getDefinition(HomePage);
    expect(def.name).toBe('home-page');
    expect(def.template).toContain('class="home-view"');
    expect((HomePage as any).title).toBe('Hono + Aurelia 2 SSR - Engineering Blog');
    expect(typeof (HomePage as any).loader).toBe('function');
  });

  it('compiles DashboardPage with static title and loader', () => {
    expect(CustomElement.isType(DashboardPage)).toBe(true);
    const def = CustomElement.getDefinition(DashboardPage);
    expect(def.name).toBe('dashboard-page');
    expect((DashboardPage as any).title).toBe('Telemetry Dashboard - Aurelia 2 SSR');
    expect(typeof (DashboardPage as any).loader).toBe('function');
  });

  it('compiles IslandsPage as CustomElement', () => {
    expect(CustomElement.isType(IslandsPage)).toBe(true);
    const def = CustomElement.getDefinition(IslandsPage);
    expect(def.name).toBe('islands-page');
  });
});
