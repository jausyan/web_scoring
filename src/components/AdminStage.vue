<script setup>
import { computed, reactive } from 'vue'
import { useLive } from '../stores/live'
import { rankTeams, sortedByOrder, sortedRounds, activeRoundOf } from '../lib/ranking'
import * as A from '../lib/actions'

const props = defineProps({ stage: { type: String, required: true } })
const { state } = useLive()

const data = computed(() => state.value[props.stage])
const rounds = computed(() => sortedRounds(data.value.rounds))
const round = computed(() => activeRoundOf(data.value))
const teams = computed(() => sortedByOrder(data.value.teams))
const posMap = computed(() => Object.fromEntries(rankTeams(data.value.teams).map((t) => [t.id, t.pos])))
const custom = reactive({})

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
</script>

<template>
  <section class="stage">
    <!-- rounds -->
    <div class="card block">
      <div class="bh">
        <h3>Babak & Poin</h3>
        <span class="muted">Babak aktif menentukan tombol + / − di bawah</span>
      </div>
      <div class="rounds">
        <div v-for="r in rounds" :key="r.id" class="round" :class="{ on: r.id === round.id }">
          <button class="pick" :class="{ active: r.id === round.id }" @click="A.setActiveRound(stage, r.id)" :title="'Aktifkan ' + r.name">
            {{ r.id === round.id ? 'AKTIF' : 'PILIH' }}
          </button>
          <input class="input name" :value="r.name" @change="A.saveRound(stage, r.id, { name: $event.target.value })" />
          <label class="pt plus">+<input class="input" type="number" min="0" :value="r.plus" @change="A.saveRound(stage, r.id, { plus: num($event) })" /></label>
          <label class="pt minus">−<input class="input" type="number" min="0" :value="r.minus" @change="A.saveRound(stage, r.id, { minus: num($event) })" /></label>
          <button class="btn sm ghost" @click="delRound(r)" title="Hapus babak">Hapus</button>
        </div>
        <button class="btn sm" @click="A.addRound(stage, data.rounds)">+ Tambah Babak</button>
      </div>
    </div>

    <!-- teams -->
    <div class="teams" :class="stage">
      <div v-for="t in teams" :key="t.id" class="team card" :style="{ '--c': t.color }">
        <div class="row1">
          <span class="no">{{ t.order }}</span>
          <input class="input tname" :value="t.name" @change="A.setTeamField(stage, t.id, 'name', $event.target.value)" />
          <input v-if="stage === 'final'" type="color" class="color" :value="t.color" @change="A.setTeamField(stage, t.id, 'color', $event.target.value)" />
        </div>
        <div class="row2">
          <span class="pos">P{{ posMap[t.id] }}</span>
          <span class="score mono">{{ t.score }}</span>
        </div>
        <div class="row3">
          <button class="btn green big" @click="add(t.id, round.plus)">+{{ round.plus }}</button>
          <button class="btn minus big" @click="add(t.id, -round.minus)">−{{ round.minus }}</button>
        </div>
        <div class="row4">
          <input v-model="custom[t.id]" class="input" type="number" min="0" placeholder="Poin lain" @keyup.enter="applyCustom(t.id, 1)" />
          <button class="btn sm green" @click="applyCustom(t.id, 1)">+</button>
          <button class="btn sm minus" @click="applyCustom(t.id, -1)">−</button>
        </div>
        <slot name="team-extra" :team="t" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage { display: flex; flex-direction: column; gap: 16px; }
.block { padding: 16px; }
.bh { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.bh h3 { margin: 0; font-style: italic; text-transform: uppercase; }
.rounds { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.round {
  display: flex; align-items: center; gap: 6px; padding: 6px; border-radius: 8px;
  background: #15151e; border: 1px solid var(--line);
}
.round.on { border-color: var(--red); box-shadow: 0 0 0 1px var(--red); }
.pick {
  background: #222230; border: 1px solid var(--line); color: var(--muted);
  font-size: 11px; font-weight: 900; font-style: italic; letter-spacing: 0.08em;
  border-radius: 4px; cursor: pointer; padding: 6px 10px;
}
.pick.active { background: var(--red); border-color: var(--red); color: #fff; }
.round .name { width: 150px; }
.pt { display: flex; align-items: center; gap: 2px; font-weight: 900; }
.pt .input { width: 62px; }
.pt.plus { color: var(--green); }
.pt.minus { color: #ff6b63; }

.teams { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.teams.final { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.team { padding: 12px; display: flex; flex-direction: column; gap: 8px; border-top: 4px solid var(--c); }
.row1 { display: flex; align-items: center; gap: 6px; }
.no { font-weight: 900; color: var(--muted); width: 22px; text-align: center; }
.tname { font-weight: 700; }
.color { width: 36px; height: 34px; border: 0; background: none; padding: 0; cursor: pointer; }
.row2 { display: flex; align-items: center; justify-content: space-between; }
.pos { background: #2b2b3c; padding: 2px 8px; border-radius: 4px; font-weight: 900; font-style: italic; }
.score { font-size: 40px; font-weight: 900; line-height: 1; }
.row3 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.big { font-size: 20px; padding: 10px; }
.row4 { display: flex; gap: 6px; }
.row4 .input { flex: 1; min-width: 0; }
</style>
