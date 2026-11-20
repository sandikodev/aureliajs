<script lang="ts">
  let {
    value = 0,
    onChange,
    onCounterChange,
  }: {
    value?: number;
    onChange?: (val: number) => void;
    onCounterChange?: (val: number) => void;
  } = $props();

  // 1. ISOLATED LOCAL STATE (Svelte 5 Runes)
  let localStep = $state<number>(1);
  let localClicks = $state<number>(0);

  // 2. ISOLATED DOM MANIPULATION (Direct element binding)
  let meterBarEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (meterBarEl) {
      const percentage = Math.min(Math.max(value * 2, 5), 100);
      meterBarEl.style.width = `${percentage}%`;
      meterBarEl.style.filter = `hue-rotate(${value * 15}deg)`;
    }
  });

  function notifyChange(next: number) {
    localClicks++;
    onChange?.(next);
    onCounterChange?.(next);
  }

  function cycleLocalStep() {
    localStep = localStep === 1 ? 5 : localStep === 5 ? 10 : 1;
  }
</script>

<div class="framework-card svelte-card">
  <div class="framework-header">
    <span class="framework-logo">🟠</span>
    <div>
      <strong class="svelte-title">Svelte 5 Runes Component</strong>
      <p class="framework-sub">Idiomatic $state, $effect &amp; Direct DOM Element Binding</p>
    </div>
  </div>

  <!-- Scope Breakdown Badges -->
  <div class="scope-pills">
    <span class="pill pill-shared">Shared: {value}</span>
    <span class="pill pill-isolated">Isolated Clicks: {localClicks}</span>
    <span class="pill pill-step">Step: &plusmn;{localStep}</span>
  </div>

  <!-- Local DOM Manipulation Indicator -->
  <div class="meter-wrapper">
    <div class="meter-label">
      <span>Svelte Local DOM Bind Meter:</span>
      <span>{Math.min(value * 2, 100)}%</span>
    </div>
    <div class="meter-track">
      <div bind:this={meterBarEl} class="meter-bar svelte-meter-bar"></div>
    </div>
  </div>

  <!-- Controls -->
  <div class="framework-controls">
    <button
      type="button"
      class="btn-framework btn-svelte"
      onclick={() => notifyChange(value + localStep)}
    >
      +{localStep} Shared
    </button>
    <button
      type="button"
      class="btn-framework btn-sub"
      onclick={() => notifyChange(value - localStep)}
    >
      -{localStep}
    </button>
    <button
      type="button"
      class="btn-framework btn-isolated"
      onclick={cycleLocalStep}
      title="Toggles local step size exclusively inside Svelte without affecting Aurelia host"
    >
      Step: &plusmn;{localStep} (Local)
    </button>
    <button type="button" class="btn-framework btn-link-reset" onclick={() => notifyChange(0)}
      >Reset</button
    >
  </div>
</div>
