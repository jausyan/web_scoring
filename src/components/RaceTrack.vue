<script setup>
import { computed } from 'vue'
import { useLive } from '../stores/live'
import { rankTeams, sortedByOrder, fmtDelta } from '../lib/ranking'
import { useScoreFlash } from '../composables/useScoreFlash'
import TopBar from './TopBar.vue'
import CarSvg from './CarSvg.vue'
import StartLights from './StartLights.vue'
import F1Icon from './F1Icon.vue'

const { state } = useLive()
const fin = computed(() => state.value.final)
const lanes = computed(() => sortedByOrder(fin.value.teams))
const ranked = computed(() => rankTeams(fin.value.teams))
const posMap = computed(() => Object.fromEntries(ranked.value.map((t) => [t.id, t.pos])))
const leaderScore = computed(() => ranked.value[0]?.score ?? 0)
const winnerId = computed(() => fin.value.podium?.[0] || null)
const winner = computed(() => (winnerId.value ? lanes.value.find((t) => t.id === winnerId.value) : null))
const scale = computed(() => Math.max(Number(fin.value.target) || 100, ...lanes.value.map((t) => t.score), 1))
const marks = computed(() => [0.25, 0.5, 0.75].map((f) => ({ f, v: Math.round(scale.value * f) })))
const flashes = useScoreFlash(() => fin.value.teams)

function progress(t) {
  if (winnerId.value === t.id) return 1
  return Math.min(1, Math.max(0, t.score / scale.value))
}
</script>

<template>
  <div class="screen">
    <TopBar stage="final" title="Grand Final" />
    <main class="main">
      <section class="track">
        <div class="kerb edge" />
        <div class="lanes">
          <div class="startline" />
          <div v-for="m in marks" :key="m.f" class="mark" :style="{ '--f': m.f }"><span>{{ m.v }}</span></div>
          <div class="finish chk-strip"><span class="flabel">FINISH · {{ scale }}</span></div>

          <div
            v-for="(t, i) in lanes"
            :key="t.id"
            class="lane"
            :class="{ lead: posMap[t.id] === 1 && t.score > 0, won: winnerId === t.id }"
          >
            <div class="lane-no">{{ i + 1 }}</div>
            <div class="lane-name">{{ t.name }}</div>
            <div
              class="car-wrap"
              :class="{ moving: flashes[t.id]?.delta > 0, back: flashes[t.id]?.delta < 0 }"
              :style="{ '--p': progress(t) }"
            >
              <div class="tag" :style="{ '--c': t.color }">
                <span class="tpos">P{{ posMap[t.id] }}</span>
                <span class="tname">{{ t.name }}</span>
                <span class="tscore mono">{{ t.score }}</span>
                <span v-if="flashes[t.id]" :key="flashes[t.id].key" class="chip" :class="flashes[t.id].delta > 0 ? 'pos' : 'neg'">
                  {{ fmtDelta(flashes[t.id].delta) }}
                </span>
              </div>
              <div class="speed" />
              <CarSvg :color="t.color" :number="t.number ?? i + 1" />
              <div v-if="winnerId === t.id" class="crown"><F1Icon name="trophy" :size="28" /></div>
            </div>
          </div>
        </div>
        <div class="kerb edge" />

        <Transition name="win">
          <div v-if="winner" class="winner-banner">
            <span class="flagwave chk-strip" />
            <div>
              <div class="wk">PEMENANG GRAND FINAL</div>
              <div class="wn">{{ winner.name }}</div>
            </div>
            <span class="flagwave chk-strip r" />
          </div>
        </Transition>

        <StartLights :seq="fin.startSeq || 0" />
      </section>

      <aside class="tower">
        <div class="th"><span class="brand"><span class="logo">LIVE</span></span> TIMING</div>
        <TransitionGroup name="tw" tag="div" class="trows">
          <div v-for="t in ranked" :key="t.id" class="trow" :class="{ p1: t.pos === 1 }">
            <span class="p">{{ t.pos }}</span>
            <span class="s" :style="{ background: t.color }" />
            <span class="n">{{ t.name }}</span>
            <span class="g mono">{{ t.pos === 1 ? 'LEADER' : '−' + (leaderScore - t.score) }}</span>
            <span class="v mono">{{ t.score }}</span>
          </div>
        </TransitionGroup>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.screen { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
.main { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr clamp(240px, 22vw, 420px); }

/* ---------- track ---------- */
.track {
  position: relative; display: flex; flex-direction: column; min-width: 0;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.015) 0 2px, transparent 2px 6px),
    linear-gradient(180deg, #2e2e36, #26262d);
  --carw: clamp(110px, 11vw, 210px);
}
.edge { height: clamp(10px, 1.6vh, 18px); flex: none; }
.lanes { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0; }
.startline { position: absolute; left: 3%; top: 0; bottom: 0; width: 6px; background: #fff; opacity: 0.85; }
.mark {
  position: absolute; top: 0; bottom: 0; left: calc(3% + var(--f) * 91%); width: 0;
  border-left: 2px dashed rgba(255, 255, 255, 0.12);
}
.mark span {
  position: absolute; top: 6px; left: 6px; font-weight: 700; color: rgba(255, 255, 255, 0.3);
  font-size: clamp(11px, 0.9vw, 15px);
}
.finish { position: absolute; right: 6%; top: 0; bottom: 0; width: clamp(18px, 1.8vw, 32px); background-size: 16px 16px; }
.flabel {
  position: absolute; top: 6px; right: calc(100% + 8px); white-space: nowrap; font-weight: 900; font-style: italic;
  background: #111; padding: 0 8px; font-size: clamp(11px, 0.9vw, 15px);
}

.lane { position: relative; flex: 1; border-bottom: 3px dashed rgba(255, 255, 255, 0.25); min-height: 0; }
.lane:last-child { border-bottom: 0; }
.lane.lead { background: linear-gradient(90deg, rgba(255, 207, 63, 0.08), transparent 70%); }
.lane.won { background: linear-gradient(90deg, rgba(255, 207, 63, 0.18), rgba(255, 207, 63, 0.05)); }
.lane-no {
  position: absolute; left: 0.4%; top: 50%; transform: translateY(-50%); font-weight: 900; font-style: italic;
  font-size: clamp(18px, 2vw, 34px); color: rgba(255, 255, 255, 0.55);
}
.lane-name {
  position: absolute; left: 18%; right: 12%; top: 50%; transform: translateY(-50%); text-align: center;
  font-weight: 900; font-style: italic; text-transform: uppercase; font-size: clamp(28px, 5vh, 70px);
  color: rgba(255, 255, 255, 0.05); white-space: nowrap; overflow: hidden; pointer-events: none;
}

.car-wrap {
  position: absolute; top: 58%; width: var(--carw);
  left: calc(3% + var(--p) * (91% - var(--carw)));
  transform: translateY(-50%);
  transition: left 1.4s cubic-bezier(0.45, 0.05, 0.25, 1);
  z-index: 2;
}
.car-wrap.moving :deep(.car) { animation: rumble 0.12s linear 10; }
.car-wrap.back :deep(.car) { filter: drop-shadow(0 0 14px rgba(225, 6, 0, 0.9)); }
@keyframes rumble { 50% { transform: translateY(1.5px); } }

.speed {
  position: absolute; right: 92%; top: 25%; height: 50%; width: 0; opacity: 0;
  background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0 2px, transparent 2px 8px);
  mask: linear-gradient(90deg, transparent, #000);
  transition: width 0.3s, opacity 0.3s;
}
.car-wrap.moving .speed { width: 160%; opacity: 0.8; transition: width 0.2s, opacity 0.2s; }

.tag {
  position: absolute; bottom: 92%; left: 4%; display: flex; align-items: center; white-space: nowrap;
  font-size: clamp(11px, 1.05vw, 18px); font-weight: 700; border-radius: 4px; overflow: visible;
  background: #0e0e14; border-left: 5px solid var(--c); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}
.tpos { background: #fff; color: #111; font-weight: 900; font-style: italic; padding: 0 6px; }
.lane.lead .tpos { background: var(--gold); }
.tname { padding: 0 8px; text-transform: uppercase; max-width: 14vw; overflow: hidden; text-overflow: ellipsis; }
.tscore { background: var(--red); padding: 0 8px; font-weight: 900; }
.chip {
  position: absolute; left: 100%; margin-left: 6px; padding: 0 8px; border-radius: 4px; font-weight: 900;
  animation: floatUp 1.5s ease-out forwards;
}
.chip.pos { background: var(--green); color: #00250f; }
.chip.neg { background: var(--red); }
@keyframes floatUp { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-120%); opacity: 0; } }
.crown {
  position: absolute; right: -8%; top: -40%; color: var(--gold);
  background: rgba(15, 15, 23, 0.9); border: 2px solid var(--gold); border-radius: 6px; padding: 4px 6px;
  display: grid; place-items: center; animation: bob 1s ease-in-out infinite;
}
@keyframes bob { 50% { transform: translateY(-6px) rotate(8deg); } }

.winner-banner {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 20;
  display: flex; align-items: center; gap: 24px; padding: 18px 40px; text-align: center;
  background: rgba(10, 10, 16, 0.9); border: 3px solid var(--gold); border-radius: 12px;
  box-shadow: 0 0 60px rgba(255, 207, 63, 0.35);
}
.wk { font-weight: 900; letter-spacing: 0.2em; color: var(--gold); font-size: clamp(12px, 1.2vw, 20px); }
.wn { font-weight: 900; font-style: italic; text-transform: uppercase; font-size: clamp(30px, 4.5vw, 80px); line-height: 1.05; }
.flagwave { width: clamp(40px, 4vw, 70px); height: clamp(30px, 3vw, 50px); background-size: 12px 12px; animation: wave 0.5s ease-in-out infinite alternate; transform-origin: left center; }
.flagwave.r { transform-origin: right center; animation-delay: 0.25s; }
@keyframes wave { from { transform: skewY(-10deg) scaleX(0.9); } to { transform: skewY(10deg) scaleX(1); } }
.win-enter-active { animation: winIn 0.6s cubic-bezier(0.2, 1.4, 0.4, 1); }
.win-leave-active { transition: opacity 0.3s; }
.win-leave-to { opacity: 0; }
@keyframes winIn { from { transform: translate(-50%, -50%) scale(0.3); opacity: 0; } }

/* ---------- timing tower ---------- */
.tower { background: #0c0c12; border-left: 3px solid var(--red); display: flex; flex-direction: column; padding: 14px; gap: 10px; }
.th { font-weight: 900; font-style: italic; font-size: clamp(16px, 1.6vw, 26px); display: flex; gap: 8px; align-items: center; }
.trows { display: flex; flex-direction: column; gap: 6px; position: relative; }
.trow {
  display: flex; align-items: center; background: #1b1b26; border-radius: 4px; overflow: hidden;
  font-size: clamp(14px, 1.4vw, 24px); height: clamp(40px, 6.5vh, 70px);
}
.trow.p1 { background: linear-gradient(90deg, #5a4500, #1b1b26); }
.trow .p { width: 2em; align-self: stretch; display: grid; place-items: center; background: #fff; color: #111; font-weight: 900; font-style: italic; }
.trow.p1 .p { background: var(--gold); }
.trow .s { width: 5px; align-self: stretch; margin: 0 8px 0 4px; }
.trow .n { flex: 1; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.trow .g { font-size: 0.6em; color: var(--muted); margin-right: 8px; font-weight: 700; }
.trow .v { font-weight: 900; padding-right: 10px; min-width: 2.4em; text-align: right; }
.tw-move { transition: transform 0.7s cubic-bezier(0.45, 0.05, 0.25, 1); }
</style>
