<script setup lang="ts">
  const props = defineProps<{
    value: number;
  }>();

  const emit = defineEmits<{
    (e: "counterChange", val: number): void;
  }>();

  const increment = () => emit("counterChange", props.value + 1);
  const decrement = () => emit("counterChange", props.value - 1);
  const reset = () => emit("counterChange", 0);
</script>

<template>
  <div class="island-card vue-card">
    <div class="island-header">
      <span class="island-logo">🟢</span>
      <div>
        <strong class="vue-title">Vue 3 Island Component</strong>
        <p class="island-sub">
          Pure Single File Component (.vue SFC) di Aurelia
        </p>
      </div>
    </div>
    <div class="island-controls">
      <span class="island-value vue-val">{{ value }}</span>
      <button class="btn-island btn-vue" @click="increment">+ Vue State</button>
      <button class="btn-island btn-sub" @click="decrement">-</button>
      <button class="btn-island btn-link-reset" @click="reset">Reset</button>
    </div>
  </div>
</template>
