<script setup>
import { computed, reactive } from 'vue'
import { useLive } from '../stores/live'
import {
  rankTeams,
  sortedByOrder,
  sortedRounds,
  activeRoundOf,
  findTiedGroups,
} from '../lib/ranking'
import * as A from '../lib/actions'

const props = defineProps({ stage: { type: String, required: true } })
const { state } = useLive()

const data = computed(() => state.value[props.stage])
const rounds = computed(() => sortedRounds(data.value.rounds))
const round = computed(() => activeRoundOf(data.value))
const teams = computed(() => sortedByOrder(data.value.teams))
const ranked = computed(() => rankTeams(data.value.teams))
const posMap = computed(() => Object.fromEntries(ranked.value.map((t) => [t.id, t.pos])))
const custom = reactive({})

const tiedGroups = computed(() => findTiedGroups(data.value.teams))
const tiedScoreSet = computed(() => new Set(tiedGroups.value.map((g) => g.score)))

const add = (id, d) => A.addScore(props.stage, id, d, round.value.id)
function applyCustom(id, sign) {
  const n = Math.abs(Number(custom[id]))
  if (!n) return
  add(id, sign * n)
  custom[id] = ''
}
const num = (e) => Math.abs(Number(e.target.value) || 0)
function delRound(r) {
  if (rounds.value.length <= 1) return alert('Minimal harus ada 1 babak.')
  if (confirm(`Hapus ${r.name}?`)) A.deleteRound(props.stage, r.id)
}

function bumpTiePriority(t, delta) {
  const cur = Number(t.tiePriority) || 0
  A.setTiePriority(props.stage, t.id, cur + delta)
}
</script>

<template>
  <section class="stage">
    <!-- rounds -->
    <div class="card block">
      <div class="bh">
        <h3>Babak & Poin</h3>
        <span class="muted">Babak aktif menentukan nilai tombol + / − di bawah</span>
      </div>
      <div class="rounds">
        <div
          v-for="r in rounds"
          :key="r.id"
          class="round"
          :class="{ on: r.id === round.id }"
        >
          <button
            class="pick"
            :class="{ active: r.id === round.id }"
            @click="A.setActiveRound(stage, r.id)"
            :title="'Aktifkan ' + r.name"
          >
            {{ r.id === round.id ? 'AKTIF' : 'PILIH' }}
          </button>
          <input
            class="input name"
            :value="r.name"
            @change="A.saveRound(stage, r.id, { name: $event.target.value })"
          />
          <label class="pt plus"
            >+<input
              class="input"
              type="number"
              min="0"
              :value="r.plus"
              @change="A.saveRound(stage, r.id, { plus: num($event) })"
          /></label>
          <label class="pt minus"
            >−<input
              class="input"
              type="number"
              min="0"
              :value="r.minus"
              @change="A.saveRound(stage, r.id, { minus: num($event) })"
          /></label>
          <button class="btn sm ghost" @click="delRound(r)" title="Hapus babak">
            Hapus
          </button>
        </div>
        <button class="btn sm primary" @click="A.addRound(stage, data.rounds)">
          + Tambah Babak
        </button>
      </div>
    </div>

    <!-- teams -->
    <div class="teams" :class="stage">
      <div
        v-for="t in teams"
        :key="t.id"
        class="team card"
        :style="{ '--c': t.color }"
      >
        <div class="row1">
          <span class="no">{{ t.order }}</span>
          <input
            class="input tname"
            :value="t.name"
            @change="A.setTeamField(stage, t.id, 'name', $event.target.value)"
          />
          <input
            v-if="stage === 'final'"
            type="color"
            class="color"
            :value="t.color"
            @change="A.setTeamField(stage, t.id, 'color', $event.target.value)"
          />
        </div>
        <div class="row2">
          <div class="pos-wrap">
            <span class="pos" :class="{ lead: posMap[t.id] <= (stage === 'quarter' ? 5 : 1) }">
              P{{ posMap[t.id] }}
            </span>
            <span v-if="tiedScoreSet.has(t.score) && t.score > 0" class="tie-chip">
              Skor Sama
            </span>
          </div>
          <span class="score mono">{{ t.score }}</span>
        </div>

        <!-- Tie-break consideration button if scores are tied (Item 2) -->
        <div v-if="stage === 'quarter' && tiedScoreSet.has(t.score) && t.score > 0" class="tie-actions">
          <span class="tie-label">Prioritas Tie-Break:</span>
          <button class="btn sm primary" @click="bumpTiePriority(t, 1)" title="Naikkan prioritas tie-break">+ Unggul</button>
          <button class="btn sm minus" @click="bumpTiePriority(t, -1)" title="Turunkan prioritas tie-break">− Kalah</button>
        </div>

        <div class="row3">
          <button class="btn green big" @click="add(t.id, round.plus)">
            +{{ round.plus }}
          </button>
          <button class="btn minus big" @click="add(t.id, -round.minus)">
            −{{ round.minus }}
          </button>
        </div>
        <div class="row4">
          <input
            v-model="custom[t.id]"
            class="input"
            type="number"
            min="0"
            placeholder="Poin kustom"
            @keyup.enter="applyCustom(t.id, 1)"
          />
          <button class="btn sm green" @click="applyCustom(t.id, 1)">+</button>
          <button class="btn sm minus" @click="applyCustom(t.id, -1)">−</button>
        </div>
        <slot name="team-extra" :team="t" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.block {
  padding: 16px 20px;
}
.bh {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.bh h3 {
  margin: 0;
  font-style: italic;
  text-transform: uppercase;
  color: var(--cyan);
}
.rounds {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.round {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  transition: border-color 0.15s;
}
.round.on {
  border-color: var(--cyan);
  box-shadow: 0 0 0 1px var(--cyan);
}
.pick {
  background: #141c30;
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.08em;
  border-radius: 4px;
  cursor: pointer;
  padding: 6px 10px;
}
.pick.active {
  background: var(--blue);
  border-color: var(--cyan);
  color: #fff;
  box-shadow: 0 0 8px rgba(4, 105, 239, 0.4);
}
.round .name {
  width: 150px;
}
.pt {
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 900;
}
.pt .input {
  width: 62px;
}
.pt.plus {
  color: var(--green);
}
.pt.minus {
  color: #ff6b63;
}

.teams {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
}
.teams.final {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.team {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 4px solid var(--c);
  background: var(--panel);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.row1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.no {
  font-weight: 900;
  color: var(--muted);
  width: 24px;
  text-align: center;
  font-size: 14px;
}
.tname {
  font-weight: 700;
}
.color {
  width: 36px;
  height: 34px;
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
}
.row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pos-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pos {
  background: #141c30;
  border: 1px solid var(--line);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 900;
  font-style: italic;
  color: var(--muted);
}
.pos.lead {
  background: linear-gradient(135deg, var(--blue), var(--cyan));
  color: #061426;
  border-color: var(--cyan);
}
.tie-chip {
  font-size: 10px;
  font-weight: 900;
  background: var(--coral);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}
.tie-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(251, 67, 37, 0.1);
  border: 1px solid rgba(251, 67, 37, 0.3);
  padding: 6px 8px;
  border-radius: 6px;
}
.tie-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--coral);
  flex: 1;
}
.score {
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
}
.row3 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.big {
  font-size: 20px;
  padding: 10px;
}
.row4 {
  display: flex;
  gap: 6px;
}
.row4 .input {
  flex: 1;
  min-width: 0;
}
</style>
