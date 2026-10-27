<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLive } from '../stores/live'
import { useAuth } from '../stores/auth'
import { rankTeams, fmtDelta } from '../lib/ranking'
import { SCREENS } from '../lib/defaultState'
import * as A from '../lib/actions'
import {
  downloadQuarterCsv,
  downloadFinalCsv,
  downloadAllScoresCsv,
  downloadScoresJson,
  importScoresJson,
} from '../lib/export'
import AdminStage from '../components/AdminStage.vue'
import F1Icon from '../components/F1Icon.vue'

const router = useRouter()
const { state, connected, mode } = useLive()
const auth = useAuth()

const tab = ref('quarter')
const screen = computed(() => state.value.display.screen)
const last = computed(() => A.lastLog(state.value))
const lastText = computed(() => {
  const e = last.value
  if (!e) return ''
  const t = state.value[e.stage]?.teams?.[e.teamId]
  return `${t?.name ?? e.teamId} ${fmtDelta(e.delta)}`
})

/* ---- final ---- */
const fin = computed(() => state.value.final)
const qTop5 = computed(() => rankTeams(state.value.quarter.teams).slice(0, 5))
const fRanked = computed(() => rankTeams(fin.value.teams))
const target = ref(100)
watch(() => fin.value.target, (v) => (target.value = v), { immediate: true })
const podiumPick = ref(['', '', ''])
function fillFromScore() { podiumPick.value = fRanked.value.slice(0, 3).map((t) => t.id) }
watch(() => fin.value.podium, (p) => { if (p) podiumPick.value = [...p, '', '', ''].slice(0, 3); else fillFromScore() }, { immediate: true })
const teamName = (id) => fin.value.teams?.[id]?.name ?? '—'

function promote() {
  const names = qTop5.value.map((t, i) => `${i + 1}. ${t.name} (${t.score})`).join('\n')
  if (confirm(`Loloskan 5 besar ke Grand Final?\n\n${names}\n\nData final (skor & nama) akan diganti.`)) A.promoteTop5(state.value)
}
function showPodium() {
  const ids = podiumPick.value.filter(Boolean)
  if (new Set(ids).size !== ids.length) return alert('Satu tim tidak boleh di dua posisi podium.')
  A.setPodium(ids).then(() => A.setScreen('final-podium'))
}
function crown(t) {
  if (confirm(`Tetapkan ${t.name} sebagai PEMENANG? Mobilnya akan langsung melaju ke garis finish.`)) A.crownTeam(state.value, t.id)
}

/* ---- export / import ---- */
const jsonInput = ref(null)
const importMsg = ref('')
async function onImportJson(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!confirm(`Muat data skor dari "${file.name}"? Data saat ini akan ditimpa.`)) return
  try {
    await importScoresJson(file)
    importMsg.value = `Berhasil memuat data dari ${file.name}`
  } catch (err) {
    importMsg.value = `Gagal: ${err.message}`
  }
}

/* ---- settings ---- */
const meta = ref({ title: '', subtitle: '' })
watch(() => state.value.meta, (m) => (meta.value = { ...m }), { immediate: true })
const newPin = ref('')
const newPin2 = ref('')
const pinMsg = ref('')
async function changePin() {
  pinMsg.value = ''
  if (!/^\d{4,8}$/.test(newPin.value)) return (pinMsg.value = 'PIN harus 4–8 digit.')
  if (newPin.value !== newPin2.value) return (pinMsg.value = 'Konfirmasi tidak sama.')
  await auth.setPin(newPin.value)
  newPin.value = newPin2.value = ''
  pinMsg.value = 'PIN berhasil diganti.'
}
function confirmDo(msg, fn) { if (confirm(msg)) fn() }
async function logout() { await auth.logout(); router.push('/login') }
</script>

<template>
  <div class="admin">
    <header class="ah">
      <div class="brand"><span class="logo">LCC</span> RACE CONTROL</div>
      <span class="badge" :class="mode">{{ mode === 'firebase' ? 'ONLINE' : 'JSON LOKAL' }}</span>
      <span class="dot" :class="{ off: !connected }" />
      <span class="grow" />
      <span class="muted email">{{ auth.user.value?.email }}</span>
      <button class="btn sm green" @click="downloadAllScoresCsv(state)" title="Unduh semua skor dalam format CSV (Excel)">
        <F1Icon name="download" :size="15" /> Unduh .CSV
      </button>
      <button class="btn sm" @click="downloadScoresJson(state)" title="Simpan backup skor dalam format JSON">
        <F1Icon name="download" :size="15" /> Simpan .JSON
      </button>
      <a href="/live" target="_blank" class="btn sm">
        <F1Icon name="telemetry" :size="15" /> Buka Layar Live
      </a>
      <button class="btn sm ghost" @click="logout">Keluar</button>
    </header>

    <div class="control card">
      <div class="lbl">LAYAR LIVE</div>
      <div class="screens">
        <button v-for="(s, key) in SCREENS" :key="key" class="btn" :class="{ active: screen === key }" @click="A.setScreen(key)">
          {{ s.short }}
        </button>
      </div>
      <span class="grow" />
      <button
        v-if="tab === 'quarter'"
        class="btn sm"
        @click="downloadQuarterCsv(state)"
        title="Unduh CSV khusus Perempat Final"
      >
        <F1Icon name="download" :size="14" /> CSV Perempat Final
      </button>
      <button
        v-if="tab === 'final'"
        class="btn sm"
        @click="downloadFinalCsv(state)"
        title="Unduh CSV khusus Grand Final"
      >
        <F1Icon name="download" :size="14" /> CSV Grand Final
      </button>
      <button class="btn" :disabled="!last" @click="A.undoLast(state)" :title="lastText">
        <F1Icon name="undo" :size="15" /> Batalkan <span v-if="last" class="muted">({{ lastText }})</span>
      </button>
    </div>

    <nav class="tabs">
      <button :class="{ on: tab === 'quarter' }" @click="tab = 'quarter'">Perempat Final</button>
      <button :class="{ on: tab === 'final' }" @click="tab = 'final'">Grand Final</button>
      <button :class="{ on: tab === 'settings' }" @click="tab = 'settings'">Pengaturan & Ekspor</button>
    </nav>

    <!-- QUARTER -->
    <AdminStage v-if="tab === 'quarter'" stage="quarter" />

    <!-- FINAL -->
    <template v-else-if="tab === 'final'">
      <div class="final-tools">
        <div class="card tool">
          <h4>1 · Finalis</h4>
          <p class="muted small">5 besar perempat final saat ini:</p>
          <ol class="mini"><li v-for="t in qTop5" :key="t.id">{{ t.name }} <b>{{ t.score }}</b></li></ol>
          <button class="btn red" @click="promote">
            <F1Icon name="flag" :size="16" /> Loloskan 5 Besar ke Final
          </button>
        </div>
        <div class="card tool">
          <h4>2 · Balapan</h4>
          <label class="small">Skor garis finish (panjang lintasan)
            <div class="inline">
              <input v-model.number="target" class="input" type="number" min="1" />
              <button class="btn sm" @click="A.setTarget(target)">Simpan</button>
            </div>
          </label>
          <button class="btn lg" @click="A.startRace()">
            <F1Icon name="lights" :size="20" /> Nyalakan Lampu Start
          </button>
          <p class="muted small">Lampu start 5-merah F1 tampil di layar balapan.</p>
        </div>
        <div class="card tool">
          <h4>3 · Juara</h4>
          <div v-for="(p, i) in 3" :key="i" class="inline">
            <span class="pos-badge" :class="'p' + (i + 1)">P{{ i + 1 }}</span>
            <select v-model="podiumPick[i]" class="input">
              <option value="">—</option>
              <option v-for="t in fRanked" :key="t.id" :value="t.id">{{ t.name }} ({{ t.score }})</option>
            </select>
          </div>
          <div class="inline wrap">
            <button class="btn sm" @click="fillFromScore">Urut dari skor</button>
            <button class="btn sm ghost" :disabled="!fin.podium" @click="A.setPodium(null)">Batalkan juara</button>
          </div>
          <button class="btn red" @click="showPodium">
            <F1Icon name="trophy" :size="16" /> Tampilkan Podium
          </button>
          <p v-if="fin.podium" class="small ok">Pemenang ditetapkan: <b>{{ teamName(fin.podium[0]) }}</b></p>
        </div>
      </div>
      <AdminStage stage="final">
        <template #team-extra="{ team }">
          <button class="btn sm crown" :class="{ active: fin.podium?.[0] === team.id }" @click="crown(team)">
            <F1Icon name="trophy" :size="14" /> {{ fin.podium?.[0] === team.id ? 'Pemenang' : 'Menangkan' }}
          </button>
        </template>
      </AdminStage>
    </template>

    <!-- SETTINGS -->
    <div v-else class="settings">
      <div class="card tool">
        <h4>Ekspor Skor (.CSV)</h4>
        <p class="small muted">Unduh laporan skor siap buka di Microsoft Excel / Google Sheets:</p>
        <button class="btn green" @click="downloadQuarterCsv(state)">
          <F1Icon name="download" :size="16" /> Unduh CSV Perempat Final (20 Tim)
        </button>
        <button class="btn green" @click="downloadFinalCsv(state)">
          <F1Icon name="download" :size="16" /> Unduh CSV Grand Final (5 Tim)
        </button>
        <button class="btn red" @click="downloadAllScoresCsv(state)">
          <F1Icon name="download" :size="16" /> Unduh CSV Lengkap + Riwayat Log
        </button>
      </div>

      <div class="card tool">
        <h4>Data Skor (.JSON)</h4>
        <p class="small muted">
          Skor otomatis tersimpan dalam format JSON (<code>data/scores.json</code> saat dijalankan di server lokal & <code>localStorage</code>). Anda juga dapat mengunduh atau memuat file <code>.json</code>:
        </p>
        <button class="btn" @click="downloadScoresJson(state)">
          <F1Icon name="download" :size="16" /> Unduh / Backup Skor (.JSON)
        </button>
        <input ref="jsonInput" type="file" accept=".json,application/json" style="display: none" @change="onImportJson" />
        <button class="btn ghost" @click="jsonInput?.click()">
          <F1Icon name="upload" :size="16" /> Muat / Impor Skor (.JSON)
        </button>
        <p v-if="importMsg" class="small ok">{{ importMsg }}</p>
      </div>

      <div class="card tool">
        <h4>Info Acara</h4>
        <label class="small">Judul<input v-model="meta.title" class="input" /></label>
        <label class="small">Subjudul<input v-model="meta.subtitle" class="input" /></label>
        <button class="btn red" @click="A.setMeta(meta)">Simpan</button>
      </div>
      <div class="card tool">
        <h4>Ganti PIN Admin</h4>
        <input v-model="newPin" class="input" type="password" inputmode="numeric" maxlength="8" placeholder="PIN baru" />
        <input v-model="newPin2" class="input" type="password" inputmode="numeric" maxlength="8" placeholder="Ulangi PIN baru" />
        <button class="btn" @click="changePin">Simpan PIN</button>
        <p v-if="pinMsg" class="small">{{ pinMsg }}</p>
      </div>
      <div class="card tool danger">
        <h4>Zona Bahaya</h4>
        <button class="btn" @click="confirmDo('Reset semua skor PEREMPAT FINAL ke 0?', () => A.resetScores(state, 'quarter'))">Reset skor perempat final</button>
        <button class="btn" @click="confirmDo('Reset semua skor GRAND FINAL ke 0?', () => A.resetScores(state, 'final'))">Reset skor final</button>
        <button class="btn minus" @click="confirmDo('RESET SEMUA DATA (nama tim, babak, skor)? Tidak bisa dibatalkan!', A.resetAll)">Reset Semua Data</button>
      </div>
      <div class="card tool">
        <h4>Tautan Layar</h4>
        <p class="small muted">Buka di laptop/proyektor lain:</p>
        <code>/live</code><span class="small muted">mengikuti pilihan "Layar Live"</span>
        <code>/perempat</code><span class="small muted">papan skor / klasemen</span>
        <code>/final</code><span class="small muted">balapan / podium</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin { min-height: 100vh; padding: 16px clamp(12px, 2vw, 28px) 40px; display: flex; flex-direction: column; gap: 14px; background: var(--bg); }
.ah { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ah .brand { font-size: 24px; }
.grow { flex: 1; }
.badge { font-size: 12px; font-weight: 900; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.08em; }
.badge.firebase { background: #0b7f45; }
.badge.local { background: var(--yellow); color: #222; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); }
.dot.off { background: var(--red); }
.email { font-size: 14px; }

.control { display: flex; align-items: center; gap: 10px; padding: 10px 14px; flex-wrap: wrap; border-left: 5px solid var(--red); }
.lbl { font-weight: 900; font-style: italic; letter-spacing: 0.1em; }
.screens { display: flex; gap: 6px; flex-wrap: wrap; }

.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--line); }
.tabs button {
  background: none; border: 0; color: var(--muted); padding: 10px 18px; font-weight: 900; font-style: italic;
  text-transform: uppercase; font-size: 16px; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px;
}
.tabs button.on { color: #fff; border-color: var(--red); }

.final-tools, .settings { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.tool { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.tool h4 { margin: 0; font-style: italic; text-transform: uppercase; }
.tool label { display: flex; flex-direction: column; gap: 4px; }
.small { font-size: 13px; margin: 0; }
.mini { margin: 0; padding-left: 20px; font-size: 14px; }
.mini b { color: var(--green); }
.inline { display: flex; gap: 6px; align-items: center; }
.inline.wrap { flex-wrap: wrap; }
.pos-badge {
  min-width: 34px; height: 32px; border-radius: 4px; display: grid; place-items: center;
  font-weight: 900; font-style: italic; font-size: 14px; color: #111;
}
.pos-badge.p1 { background: var(--gold); }
.pos-badge.p2 { background: var(--silver); }
.pos-badge.p3 { background: var(--bronze); }
.ok { color: var(--gold); }
.crown.active { background: #6b5200; border-color: var(--gold); }
.danger { border-color: #5a1414; }
code { background: #12121a; padding: 2px 8px; border-radius: 4px; color: var(--gold); width: fit-content; }
</style>
