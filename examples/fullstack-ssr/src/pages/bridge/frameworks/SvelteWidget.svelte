<script lang="ts">
  interface Props {
    count?: number;
    label?: string;
    onEvent?: (event: string, payload?: unknown) => void;
  }

  let { count = 0, label = 'Svelte 5', onEvent }: Props = $props();
  let localClicks = $state(0);

  function bump() {
    localClicks += 1;
    onEvent?.('svelte:increment', { localClicks, sharedCount: count });
  }
</script>

<div class="fw-widget fw-svelte" data-testid="svelte-widget">
  <div class="fw-row">
    <span class="fw-pill">Svelte 5 Runes</span>
    <span class="fw-meta" data-testid="svelte-shared">
      Aurelia count: <strong>{count}</strong> ({label})
    </span>
  </div>
  <div class="fw-actions">
    <button type="button" class="fw-btn" data-testid="svelte-btn" onclick={bump}>
      Svelte $state: {localClicks}
    </button>
  </div>
</div>
