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

<div class="framework-card svelte-card">
  <div class="framework-header">
    <span class="framework-logo">🟠</span>
    <div>
      <strong class="svelte-title">Svelte 5 Runes Component</strong>
      <p class="framework-sub">Pure Svelte Runes ($state, $effect) & Native Reactive Bridge in Aurelia 2</p>
    </div>
  </div>
  <div class="framework-controls">
    <span class="framework-value svelte-val">{count}</span>
    <button class="btn-framework btn-svelte" onclick={increment}>+ Svelte Rune</button>
    <button class="btn-framework btn-sub" onclick={decrement}>-</button>
    <button class="btn-framework btn-link-reset" onclick={reset}>Reset</button>
  </div>
</div>
