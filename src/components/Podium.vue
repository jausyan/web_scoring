<script setup>
import { computed } from 'vue'
import { useLive } from '../stores/live'
import { rankTeams } from '../lib/ranking'
import CarSvg from './CarSvg.vue'
import F1Icon from './F1Icon.vue'

const { state } = useLive()
const fin = computed(() => state.value.final)

/** Admin override (final.podium) wins; otherwise by score. */
const order = computed(() => {
  const teams = fin.value.teams || {}
  const ranked = rankTeams(teams)
  const chosen = (fin.value.podium || []).filter((id) => teams[id])
  const rest = ranked.map((t) => t.id).filter((id) => !chosen.includes(id))
  return [...chosen, ...rest].slice(0, 3).map((id) => ({ id, ...teams[id], score: Number(teams[id].score) || 0 }))
})
const steps = computed(() => {
  const [p1, p2, p3] = order.value
  return [
    p2 && { ...p2, place: 2, cls: 'silver', delay: 1.2 },
    p1 && { ...p1, place: 1, cls: 'gold', delay: 2.4 },
    p3 && { ...p3, place: 3, cls: 'bronze', delay: 0.3 },
  ].filter(Boolean)
})

const COLORS = ['#e10600', '#ffcf3f', '#ffffff', '#00d2be', '#ff8700', '#3671c6']
const confetti = Array.from({ length: 140 }, (_, i) => ({
  left: Math.random() * 100,
  delay: 2.6 + Math.random() * 4,
  dur: 3 + Math.random() * 3,
  color: COLORS[i % COLORS.length],
  size: 6 + Math.random() * 8,
  rot: Math.random() * 360,
}))
</script>

<template>
  <div class="screen">
    <div class="spot" />
    <header class="head">
      <div class="k"><span class="logo">LCC</span> {{ state.meta.title }}</div>
      <h1>PODIUM JUARA</h1>
      <div class="chk-strip line" />
    </header>

    <main class="podium">
      <div v-for="s in steps" :key="s.id" class="step" :class="s.cls" :style="{ '--d': s.delay + 's' }">
        <div class="who">
          <div v-if="s.place === 1" class="trophy"><F1Icon name="trophy" :size="68" /></div>
          <div class="car"><CarSvg :color="s.color" :number="s.number ?? ''" /></div>
          <div class="name">{{ s.name }}</div>
          <div class="pts mono">{{ s.score }} poin</div>
        </div>
        <div class="block">
          <span class="num">{{ s.place }}</span>
          <span class="lbl">{{ s.place === 1 ? 'JUARA 1' : s.place === 2 ? 'JUARA 2' : 'JUARA 3' }}</span>
        </div>
      </div>
    </main>

    <div class="confetti">
      <i
        v-for="(c, i) in confetti" :key="i"
        :style="{ left: c.left + '%', animationDelay: c.delay + 's', animationDuration: c.dur + 's', background: c.color, width: c.size + 'px', height: c.size * 0.45 + 'px', '--r': c.rot + 'deg' }"
      />
    </div>
  </div>
</template>

<style scoped>
.screen {
  height: 100vh; overflow: hidden; position: relative; display: flex; flex-direction: column;
  background: radial-gradient(ellipse at 50% 120%, #3a0a0a 0%, #0f0f17 55%);
}
.spot {
  position: absolute; inset: 0; pointer-events: none;
  background: conic-gradient(from 180deg at 50% -10%, transparent 160deg, rgba(255, 255, 255, 0.08) 175deg, rgba(255, 255, 255, 0.12) 180deg, rgba(255, 255, 255, 0.08) 185deg, transparent 200deg);
  animation: sweep 6s ease-in-out infinite alternate;
}
@keyframes sweep { from { transform: rotate(-6deg); } to { transform: rotate(6deg); } }
.head { text-align: center; padding-top: 3vh; z-index: 1; }
.k { font-weight: 900; font-style: italic; letter-spacing: 0.2em; color: #ccc; font-size: clamp(14px, 1.4vw, 22px); }
.k .logo { background: var(--red); color: #fff; padding: 0 10px; letter-spacing: 0.05em; }
h1 { margin: 0; font-weight: 900; font-style: italic; font-size: clamp(40px, 6vw, 110px); line-height: 1; text-shadow: 0 10px 40px rgba(225, 6, 0, 0.5); }
.line { height: 12px; width: min(50vw, 600px); margin: 12px auto 0; background-size: 12px 12px; }

.podium { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: clamp(8px, 1.5vw, 24px); padding: 0 4vw; z-index: 1; }
.step { width: clamp(180px, 24vw, 420px); display: flex; flex-direction: column; align-items: center; }
.who { display: flex; flex-direction: column; align-items: center; opacity: 0; animation: whoIn 0.8s var(--d) cubic-bezier(0.2, 1.3, 0.4, 1) forwards; }
.car { width: 78%; transform: rotate(-90deg); margin: 4vh 0; }
.trophy { color: var(--gold); filter: drop-shadow(0 6px 20px rgba(255, 207, 63, 0.55)); animation: bob 1.4s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-10px); } }
.name { font-weight: 900; font-style: italic; text-transform: uppercase; font-size: clamp(20px, 2.6vw, 46px); text-align: center; line-height: 1.05; }
.pts { color: var(--muted); font-weight: 700; font-size: clamp(14px, 1.4vw, 24px); margin-bottom: 10px; }
.block {
  width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 2vh;
  border-radius: 8px 8px 0 0; transform-origin: bottom; transform: scaleY(0);
  animation: rise 0.9s calc(var(--d) - 0.3s) cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
  box-shadow: inset 0 10px 30px rgba(255, 255, 255, 0.25), 0 -10px 40px rgba(0, 0, 0, 0.5);
}
.num { font-weight: 900; font-style: italic; font-size: clamp(60px, 9vw, 170px); line-height: 1; color: rgba(0, 0, 0, 0.55); }
.lbl { font-weight: 900; letter-spacing: 0.2em; color: rgba(0, 0, 0, 0.6); font-size: clamp(12px, 1.2vw, 20px); }
.gold .block { height: 36vh; background: linear-gradient(180deg, #ffe37a, #c99a10); }
.silver .block { height: 26vh; background: linear-gradient(180deg, #f2f4f7, #9aa0a8); }
.bronze .block { height: 18vh; background: linear-gradient(180deg, #f0b07a, #9c5a26); }
@keyframes rise { to { transform: scaleY(1); } }
@keyframes whoIn { from { opacity: 0; transform: translateY(40px) scale(0.8); } to { opacity: 1; transform: none; } }

.confetti { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.confetti i { position: absolute; top: -20px; opacity: 0; animation: fall linear infinite; }
@keyframes fall {
  0% { transform: translateY(0) rotate(var(--r)); opacity: 1; }
  100% { transform: translateY(110vh) rotate(calc(var(--r) + 720deg)); opacity: 1; }
}
</style>
