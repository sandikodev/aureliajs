<script lang="ts">
  let {
    value = 0,
    onCounterChange
  }: {
    value?: number;
    onCounterChange?: (val: number) => void;
  } = $props();

  let count = $state(0);

  // Otomatis sinkron saat props dari host berubah
  $effect(() => {
    count = value;
  });

  // Saluran interupsi eksplisit langsung dari instance host
  export function updateFromHost(val: number) {
    count = val;
  }

  function increment() {
    count++;
    onCounterChange?.(count);
  }

  function decrement() {
    count--;
    onCounterChange?.(count);
  }

  function reset() {
    count = 0;
    onCounterChange?.(0);
  }
</script>

<div class="island-card svelte-card">
  <div class="island-header">
    <span class="island-logo">🟠</span>
    <div>
      <strong class="svelte-title">Svelte 5 Island Component</strong>
      <p class="island-sub">Pure Svelte Runes ($state, $effect) & Native Reactive Bridge di Aurelia</p>
    </div>
  </div>
  <div class="island-controls">
    <span class="island-value svelte-val">{count}</span>
    <button class="btn-island btn-svelte" onclick={increment}>+ Svelte Rune</button>
    <button class="btn-island btn-sub" onclick={decrement}>-</button>
    <button class="btn-island btn-link-reset" onclick={reset}>Reset</button>
  </div>
</div>
