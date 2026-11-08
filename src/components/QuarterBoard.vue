<script setup>
import { computed } from 'vue'
import { useLive } from '../stores/live'
import { rankTeams, sortedByOrder, fmtDelta, findTiedGroups } from '../lib/ranking'
import { useScoreFlash } from '../composables/useScoreFlash'
import TopBar from './TopBar.vue'

const { state } = useLive()
const teams = computed(() => sortedByOrder(state.value.quarter.teams))
const ranked = computed(() => rankTeams(state.value.quarter.teams))
const posMap = computed(() => Object.fromEntries(ranked.value.map((t) => [t.id, t.pos])))
const tiedGroups = computed(() => findTiedGroups(state.value.quarter.teams))
const tiedScoreSet = computed(() => new Set(tiedGroups.value.map((g) => g.score)))

const half = computed(() => Math.ceil(teams.value.length / 2))
const columns = computed(() => [teams.value.slice(0, half.value), teams.value.slice(half.value)])
const flashes = useScoreFlash(() => state.value.quarter.teams)
</script>

<template>
  <div class="screen">
    <TopBar stage="quarter" title="Perempat Final" />
    <main class="board">
      <div v-for="(col, ci) in columns" :key="ci" class="sheet">
        <div class="row head">
          <div class="c no">NO</div>
          <div class="c name">NAMA TIM</div>
          <div class="c score">SKOR</div>
          <div class="c pos">POSISI</div>
        </div>
        <div
          v-for="t in col"
          :key="t.id"
          class="row"
          :class="{
            up: flashes[t.id]?.delta > 0,
            down: flashes[t.id]?.delta < 0,
            qualified: posMap[t.id] <= 5,
          }"
        >
          <div class="c no">
            <span class="stripe" :style="{ background: t.color }" />
            {{ t.order }}
          </div>
          <div class="c name">
            <span class="team-label">{{ t.name }}</span>
            <span v-if="tiedScoreSet.has(t.score) && t.score > 0" class="tie-mini" title="Skor sama dengan tim lain">
              TIE
            </span>
          </div>
          <div class="c score mono">
            <span :key="t.score" class="val">{{ t.score }}</span>
            <span
              v-if="flashes[t.id]"
              :key="flashes[t.id].key"
              class="chip"
              :class="flashes[t.id].delta > 0 ? 'pos' : 'neg'"
            >
              {{ fmtDelta(flashes[t.id].delta) }}
            </span>
          </div>
          <div class="c pos">
            <span class="pbox" :class="{ top: posMap[t.id] <= 5 }">
              P{{ posMap[t.id] }}
            </span>
          </div>
        </div>
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
  background: var(--bg);
  overflow: hidden;
}
.board {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(10px, 1.4vw, 24px);
  padding: clamp(10px, 1.4vw, 24px);
  min-height: 0;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(4, 105, 239, 0.12), transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(2, 201, 251, 0.08), transparent 50%),
    var(--bg);
}
.sheet {
  display: grid;
  grid-template-rows: auto repeat(10, 1fr);
  min-height: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.row {
  display: grid;
  grid-template-columns: 11% 1fr 22% 16%;
  align-items: stretch;
  border-bottom: 1px solid var(--line);
  transition: background 0.25s ease;
}
.row:last-child {
  border-bottom: 0;
}
.row:nth-child(odd):not(.head) {
  background: rgba(255, 255, 255, 0.02);
}
.row.qualified {
  background: rgba(4, 105, 239, 0.05);
}
.row.head {
  background: linear-gradient(90deg, var(--blue), #0d4bb8);
  font-weight: 900;
  font-style: italic;
  font-size: clamp(12px, 1.1vw, 18px);
  letter-spacing: 0.08em;
  border-bottom: 2px solid var(--cyan);
}
.row.head .c {
  padding: 8px 12px;
}
.c {
  display: flex;
  align-items: center;
  padding: 0 clamp(8px, 1vw, 16px);
  border-right: 1px solid var(--line);
  position: relative;
  min-width: 0;
}
.c:last-child {
  border-right: 0;
}
.c.no {
  justify-content: center;
  font-weight: 900;
  font-size: clamp(16px, 1.8vw, 30px);
  color: var(--muted);
}
.stripe {
  position: absolute;
  left: 0;
  top: 18%;
  bottom: 18%;
  width: 5px;
  border-radius: 0 2px 2px 0;
}
.c.name {
  font-weight: 700;
  font-size: clamp(16px, 1.8vw, 30px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  gap: 8px;
}
.team-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.tie-mini {
  font-size: 10px;
  font-weight: 900;
  background: var(--coral);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.06em;
}
.c.score {
  justify-content: center;
  font-weight: 900;
  font-size: clamp(22px, 2.6vw, 44px);
}
.c.pos {
  justify-content: center;
}
.row.head .c.score,
.row.head .c.pos,
.row.head .c.no {
  justify-content: center;
}
.pbox {
  background: #1c2742;
  border: 1px solid var(--line);
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 900;
  font-style: italic;
  font-size: clamp(13px, 1.3vw, 22px);
  color: var(--muted);
}
.pbox.top {
  background: linear-gradient(135deg, var(--blue), var(--cyan));
  border-color: var(--cyan);
  color: #061426;
  box-shadow: 0 0 10px rgba(2, 201, 251, 0.4);
}
.val {
  display: inline-block;
  animation: tick 0.45s ease-out;
}
@keyframes tick {
  from {
    transform: translateY(-40%) scale(1.3);
    opacity: 0.2;
  }
}

.row.up {
  animation: flashUp 1.4s ease-out;
}
.row.down {
  animation: flashDown 1.4s ease-out;
}
@keyframes flashUp {
  0%,
  30% {
    background: rgba(0, 210, 106, 0.35);
  }
  100% {
    background: transparent;
  }
}
@keyframes flashDown {
  0%,
  30% {
    background: rgba(251, 67, 37, 0.4);
  }
  100% {
    background: transparent;
  }
}

.chip {
  position: absolute;
  right: 6%;
  top: 50%;
  font-size: 0.5em;
  font-weight: 900;
  padding: 0 8px;
  border-radius: 4px;
  animation: floatUp 1.5s ease-out forwards;
}
.chip.pos {
  background: var(--green);
  color: #00250f;
}
.chip.neg {
  background: var(--coral);
  color: #fff;
}
@keyframes floatUp {
  0% {
    transform: translateY(-50%);
    opacity: 1;
  }
  100% {
    transform: translateY(-160%);
    opacity: 0;
  }
}

.foot {
  height: 8px;
  flex: none;
}
</style>
