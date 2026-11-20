<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = withDefaults(
  defineProps<{
    value?: number;
  }>(),
  {
    value: 0,
  }
);

const emit = defineEmits<{
  (e: 'change', val: number): void;
  (e: 'counterChange', val: number): void;
}>();

// 1. ISOLATED LOCAL STATE (Private to Vue 3 SFC)
const localStep = ref<number>(1);
const localClicks = ref<number>(0);

// 2. ISOLATED DOM MANIPULATION (Direct template ref manipulation)
const meterBarRef = ref<HTMLDivElement | null>(null);

function updateMeter(val: number) {
  const el = meterBarRef.value;
  if (el) {
    const percentage = Math.min(Math.max(val * 2, 5), 100);
    el.style.width = `${percentage}%`;
    el.style.filter = `hue-rotate(${val * 12}deg)`;
  }
}

watch(
  () => props.value,
  (newVal) => {
    updateMeter(newVal ?? 0);
  }
);

onMounted(() => {
  updateMeter(props.value ?? 0);
});

function notifyChange(next: number) {
  localClicks.value++;
  emit('change', next);
  emit('counterChange', next);
}

function cycleLocalStep() {
  localStep.value = localStep.value === 1 ? 5 : localStep.value === 5 ? 10 : 1;
}
</script>

<template>
  <div class="framework-card vue-card">
    <div class="framework-header">
      <span class="framework-logo">🟢</span>
      <div>
        <strong class="vue-title">Vue 3 SFC Component</strong>
        <p class="framework-sub">Idiomatic &lt;script setup&gt;, Template Refs &amp; Isolated State</p>
      </div>
    </div>

    <!-- Scope Breakdown Badges -->
    <div class="scope-pills">
      <span class="pill pill-shared">Shared: {{ value }}</span>
      <span class="pill pill-isolated">Isolated Clicks: {{ localClicks }}</span>
      <span class="pill pill-step">Step: &plusmn;{{ localStep }}</span>
    </div>

    <!-- Local DOM Manipulation Indicator -->
    <div class="meter-wrapper">
      <div class="meter-label">
        <span>Vue Local Template Ref Meter:</span>
        <span>{{ Math.min(value * 2, 100) }}%</span>
      </div>
      <div class="meter-track">
        <div ref="meterBarRef" class="meter-bar vue-meter-bar"></div>
      </div>
    </div>

    <!-- Controls -->
    <div class="framework-controls">
      <button type="button" class="btn-framework btn-vue" @click="notifyChange(value + localStep)">
        +{{ localStep }} Shared
      </button>
      <button type="button" class="btn-framework btn-sub" @click="notifyChange(value - localStep)">
        -{{ localStep }}
      </button>
      <button 
        type="button"
        class="btn-framework btn-isolated" 
        @click="cycleLocalStep" 
        title="Toggles local step size exclusively inside Vue without affecting Aurelia host">
        Step: &plusmn;{{ localStep }} (Local)
      </button>
      <button type="button" class="btn-framework btn-link-reset" @click="notifyChange(0)">Reset</button>
    </div>
  </div>
</template>
