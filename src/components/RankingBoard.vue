<script setup>
import { computed } from 'vue'
import { useLive } from '../stores/live'
import { rankTeams } from '../lib/ranking'
import TopBar from './TopBar.vue'

const { state } = useLive()
const ranked = computed(() => rankTeams(state.value.quarter.teams))
const leader = computed(() => ranked.value[0]?.score ?? 0)
const half = computed(() => Math.ceil(ranked.value.length / 2))
const columns = computed(() => [ranked.value.slice(0, half.value), ranked.value.slice(half.value)])
const total = computed(() => ranked.value.length)
</script>

<template>
  <div class="screen">
    <TopBar stage="quarter" title="Klasemen Akhir" />
    <main class="tower-wrap">
      <div v-for="(col, ci) in columns" :key="ci" class="tower">
        <template v-for="t in col" :key="t.id">
          <div
            class="row"
            :class="{ q: t.pos <= 5, p1: t.pos === 1 }"
            :style="{ animationDelay: (total - t.pos) * 0.12 + 's' }"
          >
            <div class="pos">{{ t.pos }}</div>
            <div class="stripe" :style="{ background: t.color }" />
            <div class="name">{{ t.name }}</div>
            <div v-if="t.pos <= 5" class="tag">LOLOS FINAL</div>
            <div class="gap mono">{{ t.pos === 1 ? 'LEADER' : '−' + (leader - t.score) }}</div>
            <div class="score mono">{{ t.score }}</div>
          </div>
          <div v-if="t.pos === 5" class="cut"><span>GARIS KUALIFIKASI GRAND FINAL</span></div>
        </template>
      </div>
    </main>
    <footer class="foot kerb" />
  </div>
</template>

<style scoped>
.screen { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
.tower-wrap {
  flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(12px, 2vw, 36px);
  padding: clamp(10px, 1.6vw, 28px);
  background: radial-gradient(ellipse at 50% 0%, rgba(225, 6, 0, 0.15), transparent 60%);
}
.tower { display: flex; flex-direction: column; gap: clamp(4px, 0.6vh, 8px); min-height: 0; }
.row {
  flex: 1; display: flex; align-items: center; gap: 0; min-height: 0;
  background: linear-gradient(90deg, #22222f, #1a1a24); border-radius: 4px; overflow: hidden;
  opacity: 0; transform: translateX(-40px); animation: slideIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  font-size: clamp(14px, 1.9vw, 32px);
}
@keyframes slideIn { to { opacity: 1; transform: none; } }
.row.q { background: linear-gradient(90deg, #0d3a26, #142a20); }
.row.p1 { background: linear-gradient(90deg, #6b5200, #2a2410); box-shadow: 0 0 24px rgba(255, 207, 63, 0.25); }
.pos {
  width: 2.6em; align-self: stretch; display: grid; place-items: center; font-weight: 900; font-style: italic;
  background: #fff; color: #111; clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%);
}
.row.p1 .pos { background: var(--gold); }
.stripe { width: 6px; align-self: stretch; margin: 0 0.5em 0 0.2em; }
.name { flex: 1; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag {
  font-size: 0.5em; font-weight: 900; font-style: italic; background: var(--green); color: #002b14;
  padding: 2px 8px; border-radius: 3px; margin-right: 0.8em; letter-spacing: 0.06em;
}
.gap { width: 4.6em; text-align: right; color: var(--muted); font-size: 0.65em; font-weight: 700; }
.score { width: 3.4em; text-align: right; padding-right: 0.6em; font-weight: 900; }
.cut {
  display: flex; align-items: center; gap: 10px; color: var(--green); font-weight: 900; font-style: italic;
  font-size: clamp(10px, 0.9vw, 14px); letter-spacing: 0.15em;
}
.cut::before, .cut::after { content: ''; flex: 1; border-top: 2px dashed var(--green); }
.foot { height: 8px; flex: none; }
</style>
