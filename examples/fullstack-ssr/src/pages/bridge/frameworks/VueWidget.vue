<script setup lang="ts">
import { ref } from 'vue';

const {
  count = 0,
  label = 'Vue 3.5 SFC',
  onEvent,
} = defineProps<{
  count?: number;
  label?: string;
  onEvent?: (event: string, payload?: unknown) => void;
}>();

const localClicks = ref(0);

function handlePing() {
  localClicks.value += 1;
  onEvent?.('vue:increment', {
    localClicks: localClicks.value,
    sharedCount: count,
  });
}
</script>

<template>
  <div class="fw-widget fw-vue" data-testid="vue-widget">
    <div class="fw-row">
      <span class="fw-pill">Vue 3.5 SFC</span>
      <span class="fw-meta" data-testid="vue-shared">
        Aurelia count: <strong>{{ count }}</strong> ({{ label }})
      </span>
    </div>
    <div class="fw-actions">
      <button type="button" class="fw-btn" data-testid="vue-btn" @click="handlePing">
        Vue Ref State: {{ localClicks }}
      </button>
    </div>
  </div>
</template>
