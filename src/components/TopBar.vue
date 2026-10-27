<script setup>
import { computed } from 'vue'
import { useLive } from '../stores/live'
import { activeRoundOf } from '../lib/ranking'

const props = defineProps({ stage: { type: String, required: true }, title: String })
const { state, connected } = useLive()
const round = computed(() => activeRoundOf(state.value[props.stage]))
</script>

<template>
  <header class="topbar">
    <div class="left">
      <span class="brand"><span class="logo">LCC</span></span>
      <div class="ev">
        <div class="t1">{{ state.meta.title }}</div>
        <div class="t2">{{ state.meta.subtitle }}</div>
      </div>
    </div>
    <div class="center">
      <span class="flag chk-strip" />
      <span class="stage">{{ title }}</span>
      <span class="flag chk-strip" />
    </div>
    <div class="right">
      <div class="round">
        <span class="rname">{{ round.name }}</span>
        <span class="pts plus">+{{ round.plus }}</span>
        <span class="pts minus">−{{ round.minus }}</span>
      </div>
      <span class="dot" :class="{ off: !connected }" :title="connected ? 'Terhubung' : 'Terputus'" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 0 clamp(12px, 2vw, 32px); height: clamp(56px, 8vh, 90px);
  background: linear-gradient(180deg, #1b1b26, #12121a); border-bottom: 3px solid var(--red);
  position: relative;
}
.left { display: flex; align-items: center; gap: 14px; }
.left .brand { font-size: clamp(20px, 2.4vw, 36px); }
.ev .t1 { font-weight: 900; font-style: italic; font-size: clamp(16px, 1.7vw, 28px); line-height: 1; }
.ev .t2 { color: var(--muted); font-size: clamp(11px, 1vw, 15px); font-weight: 600; }
.center { display: flex; align-items: center; gap: 14px; }
.stage { font-weight: 900; font-style: italic; text-transform: uppercase; font-size: clamp(18px, 2.4vw, 40px); letter-spacing: 0.02em; }
.flag { width: clamp(22px, 2.5vw, 40px); height: clamp(16px, 1.8vw, 28px); background-size: 10px 10px; transform: skewX(-15deg); }
.right { display: flex; justify-content: flex-end; align-items: center; gap: 14px; }
.round {
  display: flex; align-items: center; gap: 8px; background: #0c0c12; border: 1px solid var(--line);
  padding: 4px 6px 4px 14px; border-radius: 6px; font-weight: 700; font-size: clamp(13px, 1.3vw, 20px);
}
.rname { text-transform: uppercase; font-style: italic; margin-right: 4px; }
.pts { padding: 0 10px; border-radius: 4px; font-weight: 900; }
.pts.plus { background: #0b7f45; }
.pts.minus { background: #8a1f1f; }
.dot { width: 12px; height: 12px; border-radius: 50%; background: var(--green); box-shadow: 0 0 10px var(--green); animation: blink 2s infinite; }
.dot.off { background: var(--red); box-shadow: 0 0 10px var(--red); }
@keyframes blink { 50% { opacity: 0.4; } }
</style>
