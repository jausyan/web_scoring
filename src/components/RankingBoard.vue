<script setup>
import { computed } from 'vue'
import { useLive } from '../stores/live'
import { rankTeams, findTiedGroups } from '../lib/ranking'
import TopBar from './TopBar.vue'

const { state } = useLive()
const ranked = computed(() => rankTeams(state.value.quarter.teams))
const leader = computed(() => ranked.value[0]?.score ?? 0)
const half = computed(() => Math.ceil(ranked.value.length / 2))
const columns = computed(() => [ranked.value.slice(0, half.value), ranked.value.slice(half.value)])
const total = computed(() => ranked.value.length)

const tiedGroups = computed(() => findTiedGroups(state.value.quarter.teams))
const tiedScoreMap = computed(() => {
  const map = {}
  for (const g of tiedGroups.value) {
    for (const t of g.teams) {
      map[t.id] = g
    }
  }
  return map
})
</script>

<template>
  <div class="screen">
    <TopBar stage="quarter" title="Klasemen Akhir" />
    <main class="tower-wrap">
      <div v-for="(col, ci) in columns" :key="ci" class="tower">
        <template v-for="t in col" :key="t.id">
          <div
            class="row"
            :class="{
              q: t.pos <= 5,
              eliminated: t.pos > 5,
              p1: t.pos === 1,
              hasTie: !!tiedScoreMap[t.id],
            }"
            :style="{ animationDelay: (total - t.pos) * 0.08 + 's' }"
          >
            <div class="pos">{{ t.pos }}</div>
            <div class="stripe" :style="{ background: t.color }" />
            <div class="name-block">
              <span class="name">{{ t.name }}</span>
              <span v-if="tiedScoreMap[t.id] && t.score > 0" class="tag tie">
                SKOR SAMA
              </span>
            </div>

            <!-- Item 4: Diliatin semua baik yg tereliminasi atau tidak -->
            <div v-if="t.pos <= 5" class="tag q-tag">LOLOS FINAL</div>
            <div v-else class="tag out-tag">TERELIMINASI</div>

            <div class="gap mono">
              {{ t.pos === 1 ? 'LEADER' : '−' + (leader - t.score) }}
            </div>
            <div class="score mono">{{ t.score }}</div>
          </div>
          <div v-if="t.pos === 5" class="cut">
            <span class="cut-line" />
            <span class="cut-text">BATAS KUALIFIKASI GRAND FINAL (5 BESAR)</span>
            <span class="cut-line" />
          </div>
        </template>
      </div>
    </main>
    <footer class="foot kerb" />
  </div>
</template>

<style scoped>
.screen {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}
.tower-wrap {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(12px, 2vw, 36px);
  padding: clamp(10px, 1.6vw, 24px);
  background:
    radial-gradient(ellipse at 50% 0%, rgba(4, 105, 239, 0.16), transparent 60%),
    radial-gradient(ellipse at 80% 100%, rgba(106, 44, 215, 0.1), transparent 50%),
    var(--bg);
}
.tower {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.6vh, 8px);
  min-height: 0;
}
.row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0;
  min-height: 0;
  background: linear-gradient(90deg, #151d33, #0f1526);
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
  opacity: 0;
  transform: translateX(-30px);
  animation: slideIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  font-size: clamp(13px, 1.6vw, 26px);
  transition: transform 0.2s ease, border-color 0.2s ease;
}
@keyframes slideIn {
  to {
    opacity: 1;
    transform: none;
  }
}

.row.q {
  background: linear-gradient(90deg, #102548, #0e1d38);
  border-color: rgba(4, 105, 239, 0.4);
}
.row.p1 {
  background: linear-gradient(90deg, #2b220a, #1a1e33);
  border-color: var(--gold);
  box-shadow: 0 0 20px rgba(255, 207, 63, 0.25);
}
.row.eliminated {
  opacity: 0.88;
  background: linear-gradient(90deg, #111624, #0b0f1a);
}
.row.hasTie {
  border-color: var(--coral);
}

.pos {
  width: 2.6em;
  align-self: stretch;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-style: italic;
  background: #ffffff;
  color: #070a12;
  clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%);
}
.row.q .pos {
  background: linear-gradient(135deg, var(--blue), var(--cyan));
  color: #04101e;
}
.row.p1 .pos {
  background: var(--gold);
  color: #1f1400;
}
.row.eliminated .pos {
  background: #222b40;
  color: var(--muted);
}

.stripe {
  width: 6px;
  align-self: stretch;
  margin: 0 0.5em 0 0.2em;
}
.name-block {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.name {
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag {
  font-size: 0.48em;
  font-weight: 900;
  font-style: italic;
  padding: 3px 8px;
  border-radius: 4px;
  margin-right: 0.8em;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.q-tag {
  background: linear-gradient(135deg, var(--green), #04be60);
  color: #002b14;
  box-shadow: 0 0 10px rgba(0, 210, 106, 0.3);
}
.out-tag {
  background: #252b3d;
  color: #94a3b8;
  border: 1px solid var(--line);
}
.tag.tie {
  background: var(--coral);
  color: #ffffff;
  font-size: 0.42em;
  margin-right: 0;
  box-shadow: 0 0 8px rgba(251, 67, 37, 0.4);
}

.gap {
  width: 4.8em;
  text-align: right;
  color: var(--muted);
  font-size: 0.65em;
  font-weight: 700;
}
.score {
  width: 3.4em;
  text-align: right;
  padding-right: 0.6em;
  font-weight: 900;
  color: #ffffff;
}
.row.q .score {
  color: var(--cyan);
}

.cut {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}
.cut-line {
  flex: 1;
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    var(--cyan) 0 8px,
    transparent 8px 14px
  );
}
.cut-text {
  color: var(--cyan);
  font-weight: 900;
  font-style: italic;
  font-size: clamp(10px, 0.85vw, 13px);
  letter-spacing: 0.12em;
  white-space: nowrap;
  text-shadow: 0 0 10px rgba(2, 201, 251, 0.4);
}

.foot {
  height: 8px;
  flex: none;
}
</style>
