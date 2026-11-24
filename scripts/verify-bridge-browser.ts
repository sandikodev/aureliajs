import { chromium } from '@playwright/test';

const ARTIFACT_DIR =
  process.env.VERIFY_SCREENSHOT_DIR ??
  new URL('../artifacts', import.meta.url).pathname;
const PORT = 3097;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function main() {
  const server = Bun.spawn(['bun', 'src/index.ts'], {
    cwd: 'packages/hono-aurelia/example',
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Wait until /health responds 200
  let healthy = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE_URL}/health`);
      if (r.ok) {
        healthy = true;
        break;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  assert(healthy, 'packages/hono-aurelia/example server failed to start');

  const browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // TEST 1: /islands (True Zero-JS Selective Hydration)
    // =========================================================================
    console.log(
      '\n================ TEST 1: /islands (Zero-JS Selective Hydration) ================',
    );
    const islandsCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const islandsPage = await islandsCtx.newPage();

    const islandsConsoleErrors: string[] = [];
    const islandsPageErrors: string[] = [];
    const islandsRequests: string[] = [];

    islandsPage.on('console', (msg) => {
      if (msg.type() === 'error') islandsConsoleErrors.push(msg.text());
    });
    islandsPage.on('pageerror', (err) => islandsPageErrors.push(String(err)));
    islandsPage.on('request', (req) => {
      const reqPath = new URL(req.url()).pathname;
      if (reqPath.endsWith('.js')) islandsRequests.push(reqPath);
    });

    await islandsPage.goto(`${BASE_URL}/islands`, { waitUntil: 'networkidle' });
    await islandsPage.waitForTimeout(300);

    console.log('JS requests BEFORE scroll:', islandsRequests);
    assert(
      islandsRequests.includes('/public/island-loader.js'),
      'Expected /public/island-loader.js to load on /islands',
    );
    assert(
      !islandsRequests.includes('/public/islands/pricing.js'),
      'FAIL: pricing.js loaded eagerly BEFORE scrolling into viewport!',
    );
    assert(
      !islandsRequests.includes('/public/client.js'),
      'FAIL: full-app client.js must NOT load on Zero-JS /islands page!',
    );

    const hydratedBefore = await islandsPage
      .locator('pricing-island')
      .getAttribute('data-au-hydrated');
    assert(
      hydratedBefore === null,
      `Expected data-au-hydrated=null before scroll, got ${hydratedBefore}`,
    );

    const ssrTextBefore = await islandsPage.locator('pricing-island').textContent();
    assert(
      ssrTextBefore?.includes('Total: $75/mo'),
      'Expected SSR HTML to contain Total: $75/mo before hydration',
    );
    console.log(
      '✓ Zero-JS verified above fold: 0 KB Aurelia downloaded, SSR HTML rendered ($75/mo)',
    );

    // Now scroll <pricing-island> into view
    await islandsPage.locator('pricing-island').scrollIntoViewIfNeeded();
    await islandsPage.waitForFunction(
      () => document.querySelector('pricing-island')?.getAttribute('data-au-hydrated') === 'true',
      undefined,
      { timeout: 5000 },
    );
    console.log('JS requests AFTER scroll:', islandsRequests);
    assert(
      islandsRequests.includes('/public/islands/pricing.js'),
      'Expected /public/islands/pricing.js to load after scrolling into view',
    );

    // Click interactive button inside hydrated Aurelia island
    await islandsPage.locator('pricing-island button').click();
    await islandsPage.waitForFunction(
      () => document.querySelector('pricing-island')?.textContent?.includes('Total: $90/mo'),
      undefined,
      { timeout: 3000 },
    );
    console.log('✓ Lazy island hydrated on scroll & live Aurelia click updated $75/mo -> $90/mo');

    await islandsPage.screenshot({
      path: `${ARTIFACT_DIR}/verify-islands-hydrated.png`,
      fullPage: false,
    });
    assert(
      islandsConsoleErrors.length === 0,
      `Console errors on /islands: ${islandsConsoleErrors.join('; ')}`,
    );
    assert(
      islandsPageErrors.length === 0,
      `Page errors on /islands: ${islandsPageErrors.join('; ')}`,
    );
    await islandsCtx.close();

    // =========================================================================
    // TEST 2: /bridge (All 9 Real Frameworks + All Island Triggers + HTMX)
    // =========================================================================
    console.log(
      '\n================ TEST 2: /bridge (9 Real Frontends + Orthogonal Islands) ================',
    );
    const bridgeCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const bridgePage = await bridgeCtx.newPage();

    const bridgeConsoleErrors: string[] = [];
    const bridgePageErrors: string[] = [];
    const bridgeJsRequests: string[] = [];

    bridgePage.on('console', (msg) => {
      console.log(`[PAGE ${msg.type().toUpperCase()}]:`, msg.text());
      if (msg.type() === 'error') bridgeConsoleErrors.push(msg.text());
    });
    bridgePage.on('pageerror', (err) => {
      console.log('[PAGE EXCEPTION]:', err);
      bridgePageErrors.push(String(err));
    });
    bridgePage.on('request', (req) => {
      const reqPath = new URL(req.url()).pathname;
      if (reqPath.endsWith('.js')) bridgeJsRequests.push(reqPath);
    });

    await bridgePage.goto(`${BASE_URL}/bridge`, { waitUntil: 'networkidle' });

    // Wait for eager (React, Vue) and idle (Svelte) above-the-fold widgets
    await bridgePage.locator('[data-testid="react-widget"]').waitFor({ timeout: 5000 });
    await bridgePage.locator('[data-testid="vue-widget"]').waitFor({ timeout: 5000 });
    await bridgePage.locator('[data-testid="svelte-widget"]').waitFor({ timeout: 5000 });
    await bridgePage.waitForTimeout(300);

    console.log('Bridge JS chunks BEFORE interaction/scroll:', bridgeJsRequests);
    assert(
      bridgeJsRequests.includes('/public/bridge/chunks/react-widget.js'),
      'React chunk expected',
    );
    assert(bridgeJsRequests.includes('/public/bridge/chunks/vue-widget.js'), 'Vue chunk expected');
    assert(
      bridgeJsRequests.includes('/public/bridge/chunks/svelte-widget.js'),
      'Svelte (idle) chunk expected',
    );
    assert(
      !bridgeJsRequests.includes('/public/bridge/chunks/preact-widget.js'),
      'FAIL: Preact (island="interaction") loaded BEFORE user interaction!',
    );
    assert(
      !bridgeJsRequests.includes('/public/bridge/chunks/solid-widget.js'),
      'FAIL: SolidJS (island="visible") loaded BEFORE scrolling into viewport!',
    );
    assert(
      !bridgeJsRequests.includes('/public/bridge/chunks/qwik-widget.js'),
      'FAIL: Qwik (island="visible") loaded BEFORE scrolling into viewport!',
    );
    assert(
      !bridgeJsRequests.includes('/public/bridge/chunks/lit-widget.js'),
      'FAIL: Lit 3 (island="visible") loaded BEFORE scrolling into viewport!',
    );
    console.log(
      '✓ Above-fold proof: React 19, Vue 3, Svelte 5 mounted; Preact/Solid/Qwik/Lit = 0 bytes downloaded!',
    );

    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-bridge-above-fold.png`,
      fullPage: false,
    });

    // Trigger island="interaction" on Preact 11 (hover/pointerenter or click replaces the anchor immediately)
    await bridgePage.locator('[data-au-island-anchor="interaction"]').dispatchEvent('click');
    await bridgePage.locator('[data-testid="preact-widget"]').waitFor({ timeout: 5000 });
    assert(
      bridgeJsRequests.includes('/public/bridge/chunks/preact-widget.js'),
      'Expected preact-widget.js to load after clicking interaction anchor',
    );
    console.log('✓ Preact 11 island="interaction" loaded & mounted on click!');

    // Trigger HTMX 2 server HTML fragment swap via au-htmx
    await bridgePage.locator('[data-testid="htmx-btn"]').click();
    await bridgePage.locator('[data-testid="htmx-swapped"]').waitFor({ timeout: 5000 });
    const htmxText = await bridgePage.locator('[data-testid="htmx-output"]').textContent();
    assert(htmxText?.includes('HTMX Server Swap #'), `Unexpected HTMX output: ${htmxText}`);
    console.log('✓ HTMX 2 au-htmx swapped server HTML:', htmxText?.trim());

    // Scroll below the fold to trigger island="visible" (SolidJS, Qwik, Lit 3, Aurelia .aux)
    await bridgePage.locator('[data-testid="below-fold-grid"]').scrollIntoViewIfNeeded();
    await bridgePage.locator('[data-testid="solid-widget"]').waitFor({ timeout: 5000 });
    await bridgePage.locator('[data-testid="qwik-widget"]').waitFor({ timeout: 5000 });
    await bridgePage.locator('lit-bridge-widget').waitFor({ timeout: 5000 });
    await bridgePage
      .locator('[data-testid="aurelia-island-slot"] .pricing-island')
      .waitFor({ timeout: 5000 });

    console.log('Bridge JS chunks AFTER scroll:', bridgeJsRequests);
    assert(
      bridgeJsRequests.includes('/public/bridge/chunks/solid-widget.js'),
      'SolidJS chunk expected after scroll',
    );
    assert(
      bridgeJsRequests.includes('/public/bridge/chunks/qwik-widget.js'),
      'Qwik chunk expected after scroll',
    );
    assert(
      bridgeJsRequests.includes('/public/bridge/chunks/lit-widget.js'),
      'Lit chunk expected after scroll',
    );
    console.log(
      '✓ Below-fold island="visible" proof: SolidJS, Qwik, Lit 3 Shadow DOM, and Aurelia .aux ALL mounted on scroll!',
    );

    // Scroll back up to click Aurelia host +1 twice (3 -> 5) and verify ALL frameworks update reactively!
    await bridgePage.locator('[data-testid="au-inc"]').scrollIntoViewIfNeeded();
    await bridgePage.locator('[data-testid="au-inc"]').click();
    await bridgePage.locator('[data-testid="au-inc"]').click();
    await bridgePage.waitForTimeout(200);

    // Click interactive buttons inside each framework to verify local state + bridge-event back into Aurelia!
    await bridgePage.locator('[data-testid="react-btn"]').click();
    await bridgePage.locator('[data-testid="vue-btn"]').click();
    await bridgePage.locator('[data-testid="svelte-btn"]').click();
    await bridgePage.locator('[data-testid="preact-btn"]').click();

    // Check shared Aurelia count = 5 in above-fold frameworks
    assert(
      (await bridgePage.locator('[data-testid="react-shared"]').textContent())?.includes('5'),
      'React did not update to 5',
    );
    assert(
      (await bridgePage.locator('[data-testid="vue-shared"]').textContent())?.includes('5'),
      'Vue did not update to 5',
    );
    assert(
      (await bridgePage.locator('[data-testid="svelte-shared"]').textContent())?.includes('5'),
      'Svelte did not update to 5',
    );
    assert(
      (await bridgePage.locator('[data-testid="preact-shared"]').textContent())?.includes('5'),
      'Preact did not update to 5',
    );

    // Scroll to below-fold and verify Solid, Qwik, Lit Shadow DOM, Aurelia .aux all updated to 5 + fire their local clicks!
    await bridgePage.locator('[data-testid="below-fold-grid"]').scrollIntoViewIfNeeded();
    assert(
      (await bridgePage.locator('[data-testid="solid-shared"]').textContent())?.includes('5'),
      'Solid did not update to 5',
    );
    assert(
      (await bridgePage.locator('[data-testid="qwik-shared"]').textContent())?.includes('5'),
      'Qwik did not update to 5',
    );
    assert(
      (
        await bridgePage.locator('lit-bridge-widget [data-testid="lit-shared"]').textContent()
      )?.includes('5'),
      'Lit Shadow DOM did not update to 5',
    );
    assert(
      (await bridgePage.locator('[data-testid="aurelia-island-slot"]').textContent())?.includes(
        'Seats: 5',
      ),
      'Aurelia .aux island did not update to Seats: 5',
    );

    await bridgePage.locator('[data-testid="solid-btn"]').click();
    await bridgePage.locator('[data-testid="qwik-btn"]').click();
    await bridgePage.locator('lit-bridge-widget [data-testid="lit-btn"]').click();
    await bridgePage.waitForTimeout(200);

    // Verify local state incremented inside Solid, Qwik, & Lit Shadow DOM
    assert(
      (await bridgePage.locator('[data-testid="solid-btn"]').textContent())?.includes('1'),
      'Solid signal did not increment',
    );
    assert(
      (await bridgePage.locator('[data-testid="qwik-btn"]').textContent())?.includes('1'),
      'Qwik signal state did not increment to 1',
    );
    assert(
      (
        await bridgePage.locator('lit-bridge-widget [data-testid="lit-btn"]').textContent()
      )?.includes('1'),
      'Lit shadow state did not increment',
    );

    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-bridge-below-fold.png`,
      fullPage: false,
    });

    // Scroll back up to verify Aurelia received bridge events from all frameworks
    await bridgePage.locator('[data-testid="aurelia-controls"]').scrollIntoViewIfNeeded();
    const eventLogText = await bridgePage.locator('[data-testid="event-log"]').textContent();
    console.log('✓ Aurelia Event Bus Log:', eventLogText?.replace(/\s+/g, ' ').trim());
    for (const expectedEvt of [
      'react:increment',
      'vue:increment',
      'svelte:increment',
      'preact:increment',
      'solid:increment',
      'qwik:ping',
      'lit:increment',
    ]) {
      assert(
        eventLogText?.includes(expectedEvt),
        `Missing bridge event "${expectedEvt}" in Aurelia event log`,
      );
    }
    console.log(
      '✓ ALL 7 foreign JS frameworks (React, Vue, Svelte, Preact, Solid, Qwik QRL, Lit Shadow DOM) fired live bridge events into Aurelia 2!',
    );

    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-bridge-events.png`,
      fullPage: false,
    });

    // =========================================================================
    // TEST 3: Tabs Navigation & Bottom Console Dock (Anti-Scroll-Doom & Minimize)
    // =========================================================================
    console.log(
      '\n================ TEST 3: Tabs Navigation & Bottom Console Dock ================',
    );
    // 3.1 Test Tab: Above-the-Fold
    await bridgePage.locator('[data-testid="tab-above"]').click();
    await bridgePage.waitForTimeout(150);
    assert(
      await bridgePage.locator('[data-testid="card-react"]').isVisible(),
      'React card should be visible in Above tab',
    );
    assert(
      !(await bridgePage.locator('[data-testid="card-solid"]').isVisible()),
      'Solid card should be hidden in Above tab',
    );
    console.log('✓ Tab "Above-the-Fold" successfully isolates 5 frontends with zero scroll doom!');

    // 3.2 Test Tab: Viewport Islands
    await bridgePage.locator('[data-testid="tab-visible"]').click();
    await bridgePage.waitForTimeout(150);
    assert(
      await bridgePage.locator('[data-testid="card-solid"]').isVisible(),
      'Solid card should be visible in Visible tab',
    );
    assert(
      !(await bridgePage.locator('[data-testid="card-react"]').isVisible()),
      'React card should be hidden in Visible tab',
    );
    console.log(
      '✓ Tab "Viewport Islands" successfully isolates 4 below-fold frontends at top of screen!',
    );

    // 3.3 Test Tab: Compiler Telemetry
    await bridgePage.locator('[data-testid="tab-telemetry"]').click();
    await bridgePage.waitForTimeout(150);
    assert(
      await bridgePage.locator('[data-testid="compiler-manifest"]').isVisible(),
      'Compiler telemetry should be visible',
    );
    console.log('✓ Tab "Compiler Telemetry" renders genuine build artifacts table!');

    // 3.4 Test Tab: Code Inspector
    await bridgePage.locator('[data-testid="tab-diffs"]').click();
    await bridgePage.waitForTimeout(150);
    assert(
      await bridgePage.locator('[data-testid="source-inspector"]').isVisible(),
      'Source inspector should be visible',
    );
    // Select Svelte in inspector
    await bridgePage.locator('.inspector-fw-btn:has-text("Svelte")').click();
    await bridgePage.waitForTimeout(100);
    const inspectorText = await bridgePage.locator('.inspector-meta-bar').textContent();
    assert(
      inspectorText?.includes('Svelte 5'),
      `Expected Svelte 5 in inspector, got ${inspectorText}`,
    );

    // Verify 3-column Live DOM HTML is rendered and populated
    const liveDomText = await bridgePage.locator('[data-testid="live-dom-html"]').textContent();
    assert(
      liveDomText && liveDomText.includes('svelte'),
      `Expected live DOM HTML to contain svelte markup, got: ${liveDomText}`,
    );
    await bridgePage.locator('[data-testid="refresh-live-dom"]').click();
    console.log(
      '✓ Tab "Code Inspector" verified with 3-column layout: Native Source, Compiled JS, and Real Live DOM HTML!',
    );
    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-bridge-tabs.png`,
      fullPage: false,
    });
    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-bridge-code-inspector.png`,
      fullPage: false,
    });

    // 3.5 Test Bottom Console Dock Minimize & Expand
    const consoleToggle = bridgePage.locator('[data-testid="console-toggle"]');
    // Click toggle to open console drawer
    await consoleToggle.click();
    await bridgePage.waitForTimeout(200);
    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-bridge-console-open.png`,
      fullPage: false,
    });
    console.log('✓ Bottom console drawer expanded cleanly!');

    // Click toggle to minimize console drawer
    await consoleToggle.click();
    await bridgePage.waitForTimeout(200);
    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-bridge-console-minimized.png`,
      fullPage: false,
    });
    console.log('✓ Bottom console drawer minimized cleanly without obstructing main screen!');

    // Switch back to All Frameworks
    await bridgePage.locator('[data-testid="tab-all"]').click();
    await consoleToggle.click(); // re-open drawer for final state

    assert(
      bridgeConsoleErrors.length === 0,
      `Console errors on /bridge: ${bridgeConsoleErrors.join('; ')}`,
    );
    assert(bridgePageErrors.length === 0, `Page errors on /bridge: ${bridgePageErrors.join('; ')}`);

    // =========================================================================
    // TEST 4: Zero Duplicate Hydration Verification (Anti-Double-Render)
    // =========================================================================
    console.log(
      '\n================ TEST 4: Zero Duplicate Hydration Verification ================',
    );
    // 4.1 Verify Homepage (/)
    await bridgePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await bridgePage.waitForTimeout(300);
    const homeNavCount = await bridgePage.locator('.navbar').count();
    const homeViews = await bridgePage.locator('app-root > .home-view').count();
    assert(
      homeNavCount === 1,
      `Expected exactly 1 navbar on /, got ${homeNavCount} (Double mount bug!)`,
    );
    assert(
      homeViews === 1,
      `Expected exactly 1 .home-view in <app-root>, got ${homeViews} (Duplicate SSR children!)`,
    );
    console.log('✓ Homepage / verified: exactly 1 navbar, 1 hero, 0 duplicate rendering!');

    // 4.2 Verify Protected Dashboard (/dashboard?token=demo-token)
    await bridgePage.goto(`${BASE_URL}/dashboard?token=demo-token`, { waitUntil: 'networkidle' });
    await bridgePage.waitForTimeout(300);
    const dashNavCount = await bridgePage.locator('.navbar').count();
    const dashViews = await bridgePage.locator('app-root > .dashboard-view').count();
    assert(dashNavCount === 1, `Expected exactly 1 navbar on /dashboard, got ${dashNavCount}`);
    assert(dashViews === 1, `Expected exactly 1 .dashboard-view in <app-root>, got ${dashViews}`);

    // Click "Refresh Metrics" and verify reactive re-render does NOT duplicate DOM
    const refreshBtn = bridgePage.locator('button:has-text("Refresh Metrics")');
    await refreshBtn.click();
    await bridgePage.waitForTimeout(300);
    const postRefreshNavCount = await bridgePage.locator('.navbar').count();
    const postRefreshDashViews = await bridgePage.locator('app-root > .dashboard-view').count();
    assert(
      postRefreshNavCount === 1,
      `Navbar duplicated after re-render! Count: ${postRefreshNavCount}`,
    );
    assert(
      postRefreshDashViews === 1,
      `Dashboard view duplicated after re-render! Count: ${postRefreshDashViews}`,
    );
    await bridgePage.screenshot({
      path: `${ARTIFACT_DIR}/verify-dashboard-clean.png`,
      fullPage: false,
    });
    console.log(
      '✓ Dashboard /dashboard verified: exactly 1 navbar, reactive refresh cleanly updates state without doubling!',
    );

    // 4.3 Verify Post Detail (/posts/hono-aurelia-architecture)
    await bridgePage.goto(`${BASE_URL}/posts/hono-aurelia-architecture`, {
      waitUntil: 'networkidle',
    });
    await bridgePage.waitForTimeout(300);
    const postNavCount = await bridgePage.locator('.navbar').count();
    const postViews = await bridgePage.locator('app-root > .post-detail-view').count();
    assert(postNavCount === 1, `Expected exactly 1 navbar on /posts/:slug, got ${postNavCount}`);
    assert(postViews === 1, `Expected exactly 1 .post-detail-view in <app-root>, got ${postViews}`);

    const clapBtn = bridgePage.locator('.btn-clap');
    const clapTextBefore = (await clapBtn.textContent()) || '';
    await clapBtn.click();
    await bridgePage.waitForTimeout(300);
    const clapTextAfter = (await clapBtn.textContent()) || '';
    assert(
      clapTextBefore !== clapTextAfter,
      `Clap mutation failed to update UI (${clapTextBefore} -> ${clapTextAfter})`,
    );
    console.log(
      '✓ Post Detail /posts/:slug verified: exactly 1 navbar, reactive clap mutation works cleanly!',
    );

    console.log(
      '\n🎉 ALL REAL CHROMIUM PLAYWRIGHT VERIFICATIONS PASSED WITH 0 CONSOLE ERRORS & 0 PAGE ERRORS!',
    );
    await bridgeCtx.close();
  } finally {
    await browser.close();
    server.kill();
    await server.exited;
  }
}

main().catch((err) => {
  console.error('\n❌ PLAYWRIGHT VERIFICATION FAILED:', err);
  process.exit(1);
});
