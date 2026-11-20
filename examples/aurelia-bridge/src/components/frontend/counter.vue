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
  <div class="framework-card vue-card">
    <div class="framework-header">
      <span class="framework-logo">🟢</span>
      <div>
        <strong class="vue-title">Vue 3 SFC Component</strong>
        <p class="framework-sub">
          Pure Single File Component (.vue SFC) di Aurelia
        </p>
      </div>
    </div>
    <div class="framework-controls">
      <span class="framework-value vue-val">{{ value }}</span>
      <button class="btn-framework btn-vue" @click="increment">+ Vue State</button>
      <button class="btn-framework btn-sub" @click="decrement">-</button>
      <button class="btn-framework btn-link-reset" @click="reset">Reset</button>
    </div>
  </div>
</template>
