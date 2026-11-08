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
      <img src="/logo-epw.png" alt="EPW" class="epw-logo" />
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
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 clamp(12px, 2vw, 32px);
  height: clamp(58px, 8.5vh, 90px);
  background: linear-gradient(180deg, #12182b, #0a0e1a);
  border-bottom: 3px solid var(--blue);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 10;
}
.left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ev .t1 {
  font-weight: 900;
  font-style: italic;
  font-size: clamp(16px, 1.7vw, 28px);
  line-height: 1.1;
  background: linear-gradient(90deg, #ffffff, var(--cyan-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ev .t2 {
  color: var(--muted);
  font-size: clamp(11px, 1vw, 14px);
  font-weight: 600;
}
.center {
  display: flex;
  align-items: center;
  gap: 14px;
}
.stage {
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  font-size: clamp(18px, 2.4vw, 38px);
  letter-spacing: 0.04em;
  text-shadow: 0 0 20px rgba(4, 105, 239, 0.4);
}
.flag {
  width: clamp(22px, 2.5vw, 40px);
  height: clamp(16px, 1.8vw, 28px);
  background-size: 10px 10px;
  transform: skewX(-15deg);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
}
.round {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #080c18;
  border: 1px solid var(--line);
  padding: 4px 6px 4px 14px;
  border-radius: 6px;
  font-weight: 700;
  font-size: clamp(13px, 1.3vw, 20px);
}
.rname {
  text-transform: uppercase;
  font-style: italic;
  margin-right: 4px;
  color: var(--cyan);
}
.pts {
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 900;
}
.pts.plus {
  background: #0b8045;
  color: #ffffff;
}
.pts.minus {
  background: #7a1f29;
  color: #ff9da8;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 10px var(--green);
  animation: blink 2s infinite;
}
.dot.off {
  background: var(--coral);
  box-shadow: 0 0 10px var(--coral);
}
@keyframes blink {
  50% {
    opacity: 0.4;
  }
}
</style>
