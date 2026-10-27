<script setup>
defineProps({
  color: { type: String, default: '#e10600' },
  number: { type: [Number, String], default: '' },
  helmet: { type: String, default: '#ffd400' },
})
</script>

<template>
  <svg class="car" viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg">
    <!-- suspension -->
    <g stroke="#2a2a2a" stroke-width="3">
      <line x1="46" y1="20" x2="70" y2="34" /><line x1="46" y1="70" x2="70" y2="56" />
      <line x1="156" y1="20" x2="140" y2="38" /><line x1="156" y1="70" x2="140" y2="52" />
    </g>
    <!-- tyres -->
    <g fill="#111">
      <rect x="26" y="2" width="42" height="21" rx="6" />
      <rect x="26" y="67" width="42" height="21" rx="6" />
      <rect x="140" y="6" width="34" height="17" rx="5" />
      <rect x="140" y="67" width="34" height="17" rx="5" />
    </g>
    <g class="tread" stroke="#333" stroke-width="2">
      <line x1="36" y1="4" x2="36" y2="21" /><line x1="48" y1="4" x2="48" y2="21" /><line x1="60" y1="4" x2="60" y2="21" />
      <line x1="36" y1="69" x2="36" y2="86" /><line x1="48" y1="69" x2="48" y2="86" /><line x1="60" y1="69" x2="60" y2="86" />
    </g>
    <!-- rear wing -->
    <rect x="4" y="12" width="16" height="66" rx="2" fill="#151515" />
    <rect x="8" y="14" width="8" height="62" fill="currentColor" :style="{ color }" />
    <!-- body -->
    <path
      d="M18 34 L58 29 L78 17 L118 19 L134 33 L198 40 Q212 45 198 50 L134 57 L118 71 L78 73 L58 61 L18 56 Z"
      :fill="color"
    />
    <!-- sidepod shading -->
    <path d="M78 17 L118 19 L126 27 L84 26 Z" fill="rgba(0,0,0,.25)" />
    <path d="M78 73 L118 71 L126 63 L84 64 Z" fill="rgba(0,0,0,.25)" />
    <!-- engine cover stripe -->
    <path d="M22 42 L130 41 L196 44 L196 46 L130 49 L22 48 Z" fill="rgba(255,255,255,.18)" />
    <!-- cockpit + halo -->
    <ellipse cx="110" cy="45" rx="16" ry="9" fill="#0a0a0a" />
    <circle cx="107" cy="45" r="6.5" :fill="helmet" />
    <rect x="104" y="42.5" width="7" height="5" rx="2" fill="#111" opacity=".7" />
    <path d="M96 37 Q112 33 126 45 Q112 57 96 53" fill="none" stroke="#1b1b1b" stroke-width="3" />
    <!-- front wing -->
    <rect x="196" y="8" width="13" height="74" rx="3" fill="#151515" />
    <rect x="199" y="10" width="6" height="70" rx="2" :fill="color" />
    <!-- number -->
    <text
      x="62" y="51" font-family="Titillium Web, sans-serif" font-weight="900" font-style="italic"
      font-size="18" fill="#fff" stroke="#000" stroke-width=".6" text-anchor="middle"
    >{{ number }}</text>
  </svg>
</template>

<style scoped>
.car { display: block; width: 100%; height: auto; filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.55)); }
</style>
