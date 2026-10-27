<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
})
</script>

<template>
  <svg
    class="f1-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Checkered Flag -->
    <g v-if="name === 'flag'">
      <path d="M4 3V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M4 4H20L18.5 9L20 14H4V4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
      <rect x="4" y="4" width="4" height="5" fill="currentColor" />
      <rect x="12" y="4" width="4" height="5" fill="currentColor" />
      <rect x="8" y="9" width="4" height="5" fill="currentColor" />
      <rect x="16" y="9" width="3" height="5" fill="currentColor" />
    </g>

    <!-- Championship Trophy -->
    <g v-else-if="name === 'trophy'">
      <path
        d="M7 4H17V9C17 11.7614 14.7614 14 12 14C9.23858 14 7 11.7614 7 9V4Z"
        stroke="currentColor"
        stroke-width="2"
      />
      <path d="M7 6H4V8C4 9.65685 5.34315 11 7 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path d="M17 6H20V8C20 9.65685 18.6569 11 17 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path d="M12 14V18" stroke="currentColor" stroke-width="2" />
      <path d="M8 20H16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
    </g>

    <!-- F1 Start Lights Gantry -->
    <g v-else-if="name === 'lights'">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
      <circle cx="6" cy="9.5" r="1.5" fill="currentColor" />
      <circle cx="6" cy="14.5" r="1.5" fill="currentColor" />
      <circle cx="10" cy="9.5" r="1.5" fill="currentColor" />
      <circle cx="10" cy="14.5" r="1.5" fill="currentColor" />
      <circle cx="14" cy="9.5" r="1.5" fill="currentColor" />
      <circle cx="14" cy="14.5" r="1.5" fill="currentColor" />
      <circle cx="18" cy="9.5" r="1.5" fill="currentColor" />
      <circle cx="18" cy="14.5" r="1.5" fill="currentColor" />
    </g>

    <!-- Live Timing / Telemetry Monitor -->
    <g v-else-if="name === 'telemetry'">
      <rect x="2.5" y="4" width="19" height="13" rx="2" stroke="currentColor" stroke-width="1.8" />
      <path d="M6 9H11M6 12.5H9M14 9H18M12 12.5H18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path d="M8 20H16M12 17V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </g>

    <!-- F1 Steering Wheel / Race Control -->
    <g v-else-if="name === 'control'">
      <rect x="2.5" y="6" width="19" height="12" rx="4" stroke="currentColor" stroke-width="1.8" />
      <rect x="8.5" y="9" width="7" height="4" rx="1" fill="currentColor" />
      <circle cx="6" cy="10" r="1" fill="currentColor" />
      <circle cx="18" cy="10" r="1" fill="currentColor" />
      <path d="M6 15H8M16 15H18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </g>

    <!-- F1 Speed Wing / Car Silhouette -->
    <g v-else-if="name === 'car'">
      <path
        d="M2 14L5 9H10L13 11H19L22 13.5V15H2V14Z"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <circle cx="6.5" cy="15.5" r="2.5" fill="currentColor" />
      <circle cx="17.5" cy="15.5" r="2.5" fill="currentColor" />
    </g>

    <!-- Download -->
    <g v-else-if="name === 'download'">
      <path d="M12 4V15M12 15L8 11M12 15L16 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 19H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Upload -->
    <g v-else-if="name === 'upload'">
      <path d="M12 15V4M12 4L8 8M12 4L16 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M4 19H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Undo -->
    <g v-else-if="name === 'undo'">
      <path d="M4 9H14C17.3137 9 20 11.6863 20 15C20 18.3137 17.3137 21 14 21H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M8 5L4 9L8 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Fullscreen -->
    <g v-else-if="name === 'fullscreen'">
      <path d="M4 9V4H9M15 4H20V9M20 15V20H15M9 20H4V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </svg>
</template>

<style scoped>
.f1-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
