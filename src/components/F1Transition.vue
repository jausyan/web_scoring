<script setup>
import { useTransition } from '../stores/transition'
import CarSvg from './CarSvg.vue'
const t = useTransition()
</script>

<template>
  <div class="f1t" :class="'phase-' + t.phase">
    <div class="panel red" />
    <div class="panel chk" />
    <div class="panel dark">
      <div class="lines" />
    </div>

    <div class="label" :key="'l' + t.run">
      <div class="kicker"><span class="logo">LCC</span> GRAND PRIX</div>
      <div class="title">{{ t.label }}</div>
      <div v-if="t.sub" class="sub">{{ t.sub }}</div>
      <div class="bar" />
    </div>

    <div v-if="t.phase !== 'idle'" class="runner" :key="'c' + t.run">
      <div class="trail" />
      <CarSvg color="#e10600" number="1" />
    </div>
  </div>
</template>

<style scoped>
.f1t { position: fixed; inset: 0; z-index: 9999; pointer-events: none; overflow: hidden; }
.f1t:not(.phase-idle) { pointer-events: all; }

.panel {
  position: absolute; top: -20%; bottom: -20%; left: -30%; width: 160%;
  transform: translateX(115%) skewX(-18deg);
}
.panel.red { background: var(--red); }
.panel.chk { background: var(--chk); background-size: 40px 40px; }
.panel.dark {
  background: radial-gradient(ellipse at 50% 50%, #23232f 0%, #0b0b10 70%);
}
.lines {
  position: absolute; inset: 0; opacity: 0.25;
  background: repeating-linear-gradient(0deg, transparent 0 46px, rgba(255, 255, 255, 0.08) 46px 48px);
}

.phase-in .panel, .phase-covered .panel {
  transform: translateX(0) skewX(-18deg);
  transition: transform 0.5s cubic-bezier(0.7, 0, 0.3, 1);
}
.phase-in .panel.chk, .phase-covered .panel.chk { transition-delay: 0.06s; }
.phase-in .panel.dark, .phase-covered .panel.dark { transition-delay: 0.12s; }

.phase-out .panel {
  transform: translateX(-115%) skewX(-18deg);
  transition: transform 0.55s cubic-bezier(0.7, 0, 0.3, 1);
}
.phase-out .panel.dark { transition-delay: 0s; }
.phase-out .panel.chk { transition-delay: 0.06s; }
.phase-out .panel.red { transition-delay: 0.12s; }

/* label */
.label {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; opacity: 0; text-align: center;
}
.phase-covered .label { animation: labelIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
.phase-out .label { opacity: 0; transition: opacity 0.15s; }
.kicker { font-weight: 900; font-style: italic; letter-spacing: 0.3em; font-size: clamp(14px, 1.6vw, 24px); color: #ddd; }
.kicker .logo { background: var(--red); padding: 0 10px; margin-right: 6px; letter-spacing: 0.05em; }
.title {
  font-weight: 900; font-style: italic; text-transform: uppercase;
  font-size: clamp(40px, 8vw, 140px); line-height: 1; letter-spacing: -0.01em;
  text-shadow: 0 8px 30px rgba(225, 6, 0, 0.45);
}
.sub { font-weight: 700; font-size: clamp(16px, 2vw, 30px); color: var(--muted); margin-top: 8px; }
.bar { width: 0; height: 8px; background: var(--red); margin-top: 18px; transform: skewX(-20deg); }
.phase-covered .bar { animation: bar 0.6s 0.15s ease-out forwards; }

@keyframes labelIn {
  from { opacity: 0; transform: translateX(-60px) skewX(-8deg); }
  to { opacity: 1; transform: none; }
}
@keyframes bar { to { width: min(40vw, 520px); } }

/* car fly-by */
.runner {
  position: absolute; top: 68%; left: 0; width: clamp(220px, 22vw, 360px);
  transform: translateX(-120%); animation: fly 1.25s cubic-bezier(0.45, 0.05, 0.4, 1) forwards;
}
.trail {
  position: absolute; right: 85%; top: 30%; height: 40%; width: 120vw;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.0) 30%, rgba(255, 255, 255, 0.35));
  filter: blur(2px);
  mask: repeating-linear-gradient(180deg, #000 0 3px, transparent 3px 9px);
}
@keyframes fly {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(calc(100vw + 40%)); }
}
</style>
