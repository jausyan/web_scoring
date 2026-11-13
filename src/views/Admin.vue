<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLive } from '../stores/live'
import { useAuth } from '../stores/auth'
import {
  rankTeams,
  fmtDelta,
  findTiedGroups,
  computeFinalPodium,
} from '../lib/ranking'
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
import { getActiveRoomId, setActiveRoomId } from '../lib/backend/cloud'
import { backend } from '../lib/backend'

const router = useRouter()
const { state, connected, mode } = useLive()
const auth = useAuth()
const userEmail = computed(() => auth.user.value?.email || '')

const tab = ref('quarter')
const screen = computed(() => state.value?.display?.screen || 'quarter-board')
const last = computed(() => A.lastLog(state.value))
const lastText = computed(() => {
  const e = last.value
  if (!e || !state.value) return ''
  const t = state.value[e.stage]?.teams?.[e.teamId]
  return `${t?.name ?? e.teamId} ${fmtDelta(e.delta)}`
})

/* ---- Multi-Device Realtime Connection ---- */
const roomId = ref(getActiveRoomId())
const newRoomInput = ref('')
const copyMsg = ref('')
const syncNotice = ref('')
const lanIps = ref([])

function getSecondDeviceUrl(path = '/') {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const room = roomId.value || 'lcc_epw_2026'
  if (path === '/' && room === 'lcc_epw_2026') return origin
  return `${origin}${path}${path.includes('?') ? '&' : '?'}room=${room}`
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url)
    copyMsg.value = '✓ Tautan berhasil disalin!'
    setTimeout(() => {
      copyMsg.value = ''
    }, 3000)
  } catch {
    prompt('Salin tautan ini:', url)
  }
}

function doForceSync() {
  backend.forceSync?.()
  syncNotice.value = '✓ Seluruh data skor berhasil dipancarkan ke semua laptop!'
  setTimeout(() => {
    syncNotice.value = ''
  }, 3000)
}

function changeRoom() {
  if (!newRoomInput.value.trim()) return
  if (confirm(`Ganti saluran ke "${newRoomInput.value.trim()}"? Halaman akan dimuat ulang.`)) {
    setActiveRoomId(newRoomInput.value.trim())
  }
}

/* ---- Perempat Final / Finalis Selection (Items 1, 2, 4) ---- */
const qRanked = computed(() => rankTeams(state.value?.quarter?.teams || {}))
const qTiedGroups = computed(() => findTiedGroups(state.value?.quarter?.teams || {}))
const cutoffTie = computed(() => qTiedGroups.value?.find((g) => g.spansCutoff))

// Selected team IDs to advance to Grand Final
const selectedFinalists = ref([])

// Initialize or update selection with top 5 by default
function selectTop5() {
  selectedFinalists.value = qRanked.value.slice(0, 5).map((t) => t.id)
}

watch(
  qRanked,
  () => {
    if (!selectedFinalists.value.length) selectTop5()
  },
  { immediate: true },
)

onMounted(() => {
  if (typeof fetch !== 'undefined') {
    fetch('/api/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ips?.length) lanIps.value = d.ips
      })
      .catch(() => {})
  }
})

function toggleFinalist(id) {
  const idx = selectedFinalists.value.indexOf(id)
  if (idx !== -1) {
    selectedFinalists.value.splice(idx, 1)
  } else {
    if (selectedFinalists.value.length >= 5) {
      alert('Maksimal 5 tim untuk Grand Final. Hilangkan centang tim lain terlebih dahulu.')
      return
    }
    selectedFinalists.value.push(id)
  }
}

function applySelectedFinalists() {
  if (selectedFinalists.value.length !== 5) {
    if (
      !confirm(
        `Anda baru memilih ${selectedFinalists.value.length} tim (idealnya 5 tim). Lanjutkan penetapan finalis?`,
      )
    )
      return
  }
  const chosenNames = selectedFinalists.value
    .map((id, i) => `${i + 1}. ${state.value.quarter.teams[id]?.name || id}`)
    .join('\n')

  if (
    confirm(
      `Tetapkan tim berikut sebagai 5 Besar Grand Final?\n\n${chosenNames}\n\nData Grand Final sebelumnya akan direset dengan tim ini.`,
    )
  ) {
    A.promoteSelectedTeams(state.value, selectedFinalists.value)
    tab.value = 'final'
  }
}

function resolveTiePriority(teamId, delta) {
  const t = state.value.quarter.teams[teamId]
  const cur = Number(t?.tiePriority) || 0
  A.setTiePriority('quarter', teamId, cur + delta)
}

/* ---- Grand Final & Winner (Item 3: Juara 1 Manual, 2 & 3 Otomatis by Point) ---- */
const fin = computed(() => state.value?.final || {})
const fRanked = computed(() => rankTeams(fin.value?.teams || {}))
const target = ref(100)
watch(
  () => fin.value?.target,
  (v) => (target.value = v ?? 100),
  { immediate: true },
)

// Manual Winner Selection
const manualWinnerId = ref('')
watch(
  () => fin.value?.winnerManualId || fin.value?.podium?.[0],
  (id) => {
    manualWinnerId.value = id || ''
  },
  { immediate: true },
)

// Computed resulting podium
const computedPodium = computed(() => {
  const teams = fin.value.teams || {}
  const podiumIds = computeFinalPodium(teams, manualWinnerId.value)
  return podiumIds.map((id, idx) => ({
    place: idx + 1,
    id,
    name: teams[id]?.name || id,
    score: Number(teams[id]?.score) || 0,
    isManual: idx === 0 && !!manualWinnerId.value,
  }))
})

function applyManualWinner() {
  if (!manualWinnerId.value) {
    return alert('Pilih salah satu tim sebagai Juara 1 terlebih dahulu.')
  }
  A.setManualWinner(state.value, manualWinnerId.value)
}

function publishPodium() {
  if (!manualWinnerId.value && !fin.value.podium) {
    // If admin hasn't explicitly chosen winner, auto-set from current top
    manualWinnerId.value = fRanked.value[0]?.id || ''
  }
  applyManualWinner()
  A.setScreen('final-podium')
}

function clearPodium() {
  manualWinnerId.value = ''
  A.setPodium(null)
}

function crownDirectly(team) {
  manualWinnerId.value = team.id
  A.crownTeam(state.value, team.id)
}

/* ---- Export / Import ---- */
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

/* ---- Settings ---- */
const meta = ref({ title: '', subtitle: '' })
watch(
  () => state.value?.meta,
  (m) => (meta.value = { ...(m || {}) }),
  { immediate: true },
)
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
function confirmDo(msg, fn) {
  if (confirm(msg)) fn()
}
async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="admin">
    <!-- Top Bar with Official EPW Logo & Competition Name (Items 5 & 6) -->
    <header class="ah">
      <div class="brand">
        <img src="/logo-epw.png" alt="EPW" class="epw-mini-logo" />
        <span class="comp-title">{{ state?.meta?.title || 'LCC EPW 2026' }}</span>
        <span class="panel-tag">PANEL JURI</span>
      </div>
      <span class="badge" :class="connected ? 'online' : 'offline'">
        {{ connected ? 'REALTIME ONLINE' : 'MENGHUBUNGKAN...' }}
      </span>
      <span
        class="dot"
        :class="{ off: !connected }"
        :title="connected ? 'Terhubung Multi-Perangkat (Siap Real-Time)' : 'Mencoba Terhubung...'"
      />
      <span class="grow" />
      <span class="muted email">{{ userEmail }}</span>
      <button
        class="btn sm blue"
        @click="doForceSync"
        title="Pancarkan ulang data skor ke semua laptop yang terhubung"
      >
        ⚡ Sinkronkan Semua
      </button>
      <button
        class="btn sm green"
        @click="downloadAllScoresCsv(state)"
        title="Unduh semua skor dalam format CSV (Excel)"
      >
        <F1Icon name="download" :size="15" /> Unduh .CSV
      </button>
      <button
        class="btn sm"
        @click="downloadScoresJson(state)"
        title="Simpan backup skor dalam format JSON"
      >
        <F1Icon name="download" :size="15" /> Simpan .JSON
      </button>
      <a href="/" target="_blank" class="btn sm">
        <F1Icon name="telemetry" :size="15" /> Buka Layar Live
      </a>
      <button class="btn sm ghost" @click="logout">Keluar</button>
    </header>

    <!-- Screen Switcher Control Bar -->
    <div class="control card">
      <div class="lbl">LAYAR LIVE</div>
      <div class="screens">
        <button
          v-for="(s, key) in SCREENS"
          :key="key"
          class="btn"
          :class="{ active: screen === key }"
          @click="A.setScreen(key)"
        >
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
      <button
        class="btn"
        :disabled="!last"
        @click="A.undoLast(state)"
        :title="lastText"
      >
        <F1Icon name="undo" :size="15" /> Batalkan
        <span v-if="last" class="muted">({{ lastText }})</span>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <nav class="tabs">
      <button :class="{ on: tab === 'quarter' }" @click="tab = 'quarter'">
        Perempat Final
      </button>
      <button :class="{ on: tab === 'final' }" @click="tab = 'final'">
        Grand Final & Juara
      </button>
      <button :class="{ on: tab === 'settings' }" @click="tab = 'settings'">
        Pengaturan & Ekspor
      </button>
    </nav>

    <!-- TAB 1: QUARTERFINAL -->
    <template v-if="tab === 'quarter'">
      <!-- Tie-Break Alert / Resolution Tool (Item 2) -->
      <div v-if="cutoffTie" class="card tie-alert">
        <div class="tie-alert-head">
          <span class="warn-dot" />
          <h4 class="tie-title">
            PERHATIAN: Terdapat Skor Sama di Batas Kualifikasi P5!
          </h4>
        </div>
        <p class="tie-desc">
          Tim berikut memiliki skor sama (<b>{{ cutoffTie.score }} poin</b>) pada
          posisi kualifikasi 5 besar. Gunakan tombol untuk menentukan keunggulan
          tie-break:
        </p>
        <div class="tie-team-list">
          <div
            v-for="t in cutoffTie.teams"
            :key="t.id"
            class="tie-team-row"
            :class="{ q: t.pos <= 5 }"
          >
            <span class="badge-pos">P{{ t.pos }}</span>
            <span class="t-name">{{ t.name }}</span>
            <span class="t-score">{{ t.score }} poin</span>
            <span class="t-prio muted">(Prioritas: {{ t.tiePriority || 0 }})</span>
            <div class="tie-btn-group">
              <button
                class="btn sm green"
                @click="resolveTiePriority(t.id, 1)"
                title="Naikkan posisi tim ini di atas tim yang skornya sama"
              >
                ▲ Unggulkan
              </button>
              <button
                class="btn sm minus"
                @click="resolveTiePriority(t.id, -1)"
                title="Turunkan posisi tim ini"
              >
                ▼ Turunkan
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Finalist Selector / Management: Show All Teams (Items 1 & 4) -->
      <div class="card tool finalist-manager">
        <div class="fm-header">
          <div>
            <h4>Penetapan Peserta Grand Final (5 Besar)</h4>
            <p class="muted small">
              Centang 5 tim yang akan bertanding di Grand Final. Tim dapat dipilih
              otomatis berdasarkan skor atau ditentukan secara manual oleh panitia.
            </p>
          </div>
          <div class="fm-actions">
            <span class="counter" :class="{ ok: selectedFinalists.length === 5 }">
              Terpilih: <b>{{ selectedFinalists.length }}</b> / 5 Tim
            </span>
            <button class="btn sm" @click="selectTop5">
              Pilih Otomatis 5 Besar
            </button>
            <button
              class="btn primary"
              :disabled="!selectedFinalists.length"
              @click="applySelectedFinalists"
            >
              <F1Icon name="flag" :size="16" /> Terapkan ke Grand Final
            </button>
          </div>
        </div>

        <!-- Full Table: Diliatin semua baik yg tereliminasi atau tidak (Item 4) -->
        <div class="teams-table-scroll">
          <table class="teams-table">
            <thead>
              <tr>
                <th style="width: 50px">PILIH</th>
                <th style="width: 60px">POS</th>
                <th>NAMA TIM</th>
                <th style="width: 100px">TOTAL SKOR</th>
                <th style="width: 160px">STATUS KUALIFIKASI</th>
                <th style="width: 160px">TIE-BREAK</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in qRanked"
                :key="t.id"
                :class="{
                  selected: selectedFinalists.includes(t.id),
                  qualified: t.pos <= 5,
                  eliminated: t.pos > 5,
                }"
              >
                <td class="text-center">
                  <input
                    type="checkbox"
                    class="chk-box"
                    :checked="selectedFinalists.includes(t.id)"
                    @change="toggleFinalist(t.id)"
                  />
                </td>
                <td class="text-center">
                  <span class="tbl-pos" :class="{ top: t.pos <= 5 }">
                    P{{ t.pos }}
                  </span>
                </td>
                <td class="tbl-name">
                  <span class="color-dot" :style="{ background: t.color }" />
                  <b>{{ t.name }}</b>
                </td>
                <td class="tbl-score mono text-center">
                  {{ t.score }}
                </td>
                <td>
                  <span
                    class="tbl-status-badge"
                    :class="t.pos <= 5 ? 'status-q' : 'status-out'"
                  >
                    {{ t.pos <= 5 ? '5 BESAR (LOLOS)' : 'TERELIMINASI' }}
                  </span>
                </td>
                <td>
                  <div class="tie-controls">
                    <button
                      class="btn sm ghost"
                      @click="resolveTiePriority(t.id, 1)"
                      title="Prioritaskan jika skor sama"
                    >
                      +
                    </button>
                    <span class="mono prio-val">{{ t.tiePriority || 0 }}</span>
                    <button
                      class="btn sm ghost"
                      @click="resolveTiePriority(t.id, -1)"
                      title="Turunkan jika skor sama"
                    >
                      −
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quarter Stage Scoring Grid -->
      <AdminStage stage="quarter" />
    </template>

    <!-- TAB 2: GRAND FINAL & WINNER (Items 1, 3, 4) -->
    <template v-else-if="tab === 'final'">
      <div class="final-tools">
        <!-- 1 · Balapan F1 -->
        <div class="card tool">
          <h4>1 · Lintasan & Target Skor</h4>
          <label class="small"
            >Skor garis finish (panjang lintasan balapan):
            <div class="inline">
              <input
                v-model.number="target"
                class="input"
                type="number"
                min="1"
              />
              <button class="btn sm" @click="A.setTarget(target)">Simpan</button>
            </div>
          </label>
          <button class="btn lg primary" @click="A.startRace()">
            <F1Icon name="lights" :size="20" /> Nyalakan Lampu Start F1
          </button>
          <p class="muted small">Lampu start 5-merah akan tampil di layar balapan.</p>
        </div>

        <!-- 2 · Penentuan Juara: Juara 1 Manual, 2 & 3 Otomatis by Point (Item 3) -->
        <div class="card tool winner-card">
          <h4>2 · Penentuan Juara Final</h4>
          <p class="muted small">
            <b>Juara 1 ditentukan secara manual</b> oleh admin/juri. Juara 2 dan
            Juara 3 akan <b>dihitung secara otomatis</b> berdasarkan urutan skor
            tertinggi dari tim yang tersisa.
          </p>

          <label class="small"
            ><b>PILIH JUARA 1 (MANUAL):</b>
            <select v-model="manualWinnerId" class="input" @change="applyManualWinner">
              <option value="">— Pilih Tim Juara 1 —</option>
              <option v-for="t in fRanked" :key="t.id" :value="t.id">
                {{ t.name }} (Skor: {{ t.score }})
              </option>
            </select>
          </label>

          <!-- Live Preview of Computed Podium -->
          <div class="podium-preview">
            <div class="preview-title">HASIL PODIUM OTOMATIS:</div>
            <div
              v-for="p in computedPodium"
              :key="p.place"
              class="podium-preview-row"
              :class="'rank-' + p.place"
            >
              <span class="preview-badge">P{{ p.place }}</span>
              <span class="preview-name">{{ p.name }}</span>
              <span class="preview-score mono">{{ p.score }} poin</span>
              <span class="preview-mode">
                {{ p.isManual ? 'Manual (Juara 1)' : 'Otomatis by Poin' }}
              </span>
            </div>
          </div>

          <div class="inline wrap">
            <button class="btn red" @click="publishPodium">
              <F1Icon name="trophy" :size="16" /> Tampilkan Podium di Layar Live
            </button>
            <button class="btn ghost sm" @click="clearPodium">
              Reset Juara
            </button>
          </div>
        </div>
      </div>

      <!-- Final Stage Scoring & Direct "Juara 1" Action -->
      <AdminStage stage="final">
        <template #team-extra="{ team }">
          <button
            class="btn sm crown"
            :class="{ active: manualWinnerId === team.id }"
            @click="crownDirectly(team)"
          >
            <F1Icon name="trophy" :size="14" />
            {{ manualWinnerId === team.id ? 'Juara 1 (Terpilih)' : 'Pilih Juara 1' }}
          </button>
        </template>
      </AdminStage>
    </template>

    <!-- TAB 3: SETTINGS & EXPORT -->
    <div v-else class="settings">
      <!-- Multi-Device Connection Card -->
      <div class="card tool sync-tool">
        <h4>Koneksi Multi-Laptop & Real-Time Sync</h4>
        <p class="small muted">
          Skor otomatis tersinkronisasi antar-laptop melalui Cloud Realtime Relay.
          Buka tautan di bawah ini pada laptop kedua (layar proyektor atau juri tambahan).
        </p>

        <div class="sync-status-box">
          <div class="sync-row">
            <span class="sync-label">Status Koneksi:</span>
            <span class="sync-val" :class="{ ok: connected }">
              {{ connected ? '● Terhubung Realtime' : '○ Menghubungkan ke Broker...' }}
            </span>
          </div>
          <div class="sync-row">
            <span class="sync-label">Room / Saluran:</span>
            <span class="sync-val code-val">#{{ roomId }}</span>
          </div>
        </div>

        <div class="link-box">
          <label class="small"><b>Alamat Layar Proyektor (Laptop 2 Langsung Masuk):</b></label>
          <div class="inline">
            <input readonly class="input code-input" :value="getSecondDeviceUrl('/')" />
            <button class="btn sm primary" @click="copyLink(getSecondDeviceUrl('/'))">Salin</button>
          </div>
          <span class="small muted">Laptop proyektor cukup buka alamat utama website (tanpa perlu ketik sub-link), otomatis langsung menampilkan live scoring.</span>
        </div>

        <div class="link-box">
          <label class="small"><b>Tautan Panel Juri untuk Laptop Kedua:</b></label>
          <div class="inline">
            <input readonly class="input code-input" :value="getSecondDeviceUrl('/admin')" />
            <button class="btn sm" @click="copyLink(getSecondDeviceUrl('/admin'))">Salin</button>
          </div>
        </div>

        <div v-if="lanIps.length" class="link-box">
          <label class="small"><b>IP Jaringan Lokal (WiFi yang sama):</b></label>
          <div class="inline">
            <input readonly class="input code-input" :value="`http://${lanIps[0]}:5173${roomId === 'lcc_epw_2026' ? '' : '?room=' + roomId}`" />
            <button class="btn sm ghost" @click="copyLink(`http://${lanIps[0]}:5173${roomId === 'lcc_epw_2026' ? '' : '?room=' + roomId}`)">Salin</button>
          </div>
        </div>

        <div class="inline wrap">
          <button class="btn blue" @click="doForceSync">
            ⚡ Sinkronkan Paksa ke Semua Laptop
          </button>
        </div>
        <p v-if="syncNotice" class="small ok">{{ syncNotice }}</p>
        <p v-if="copyMsg" class="small ok">{{ copyMsg }}</p>

        <div class="change-room-box">
          <label class="small">Ganti Room / Saluran Baru:</label>
          <div class="inline">
            <input v-model="newRoomInput" class="input" placeholder="misal: lcc-epw-sesi2" />
            <button class="btn sm ghost" @click="changeRoom">Ganti Room</button>
          </div>
        </div>
      </div>

      <div class="card tool">
        <h4>Ekspor Skor (.CSV)</h4>
        <p class="small muted">
          Unduh laporan skor lengkap yang kompatibel dengan Microsoft Excel &
          Google Sheets:
        </p>
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
          Skor otomatis disimpan dalam format JSON (<code>data/scores.json</code>
          saat dijalankan di server lokal & <code>localStorage</code>). Anda juga
          dapat mengunduh atau memuat backup file <code>.json</code>:
        </p>
        <button class="btn" @click="downloadScoresJson(state)">
          <F1Icon name="download" :size="16" /> Unduh / Backup Skor (.JSON)
        </button>
        <input
          ref="jsonInput"
          type="file"
          accept=".json,application/json"
          style="display: none"
          @change="onImportJson"
        />
        <button class="btn ghost" @click="jsonInput?.click()">
          <F1Icon name="upload" :size="16" /> Muat / Impor Skor (.JSON)
        </button>
        <p v-if="importMsg" class="small ok">{{ importMsg }}</p>
      </div>

      <div class="card tool">
        <h4>Info Lomba (Ubah Nama Kompetisi)</h4>
        <label class="small"
          >Nama Lomba / Judul Acara:
          <input v-model="meta.title" class="input" />
        </label>
        <label class="small"
          >Subjudul / Penyelenggara:
          <input v-model="meta.subtitle" class="input" />
        </label>
        <button class="btn primary" @click="A.setMeta(meta)">
          Simpan Info Lomba
        </button>
      </div>

      <div class="card tool">
        <h4>Ganti PIN Admin</h4>
        <input
          v-model="newPin"
          class="input"
          type="password"
          inputmode="numeric"
          maxlength="8"
          placeholder="PIN baru"
        />
        <input
          v-model="newPin2"
          class="input"
          type="password"
          inputmode="numeric"
          maxlength="8"
          placeholder="Ulangi PIN baru"
        />
        <button class="btn" @click="changePin">Simpan PIN</button>
        <p v-if="pinMsg" class="small ok">{{ pinMsg }}</p>
      </div>

      <div class="card tool danger">
        <h4>Zona Bahaya</h4>
        <button
          class="btn"
          @click="
            confirmDo('Reset semua skor PEREMPAT FINAL ke 0?', () =>
              A.resetScores(state, 'quarter'),
            )
          "
        >
          Reset Skor Perempat Final
        </button>
        <button
          class="btn"
          @click="
            confirmDo('Reset semua skor GRAND FINAL ke 0?', () =>
              A.resetScores(state, 'final'),
            )
          "
        >
          Reset Skor Final
        </button>
        <button
          class="btn minus"
          @click="
            confirmDo(
              'RESET SEMUA DATA (nama tim, babak, skor)? Tindakan ini tidak bisa dibatalkan!',
              A.resetAll,
            )
          "
        >
          Reset Seluruh Data Kompetisi
        </button>
      </div>

      <div class="card tool">
        <h4>Tautan Layar Publik</h4>
        <p class="small muted">Buka tautan ini di laptop atau proyektor panggung:</p>
        <code>/ (Utama)</code
        ><span class="small muted">langsung layar proyektor live (mengikuti pilihan juri di atas)</span>
        <code>/perempat</code
        ><span class="small muted">khusus papan skor / klasemen perempat final</span>
        <code>/final</code
        ><span class="small muted">khusus balapan lintasan / podium grand final</span>
        <code>/portal</code
        ><span class="small muted">portal pilihan menu</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  padding: 16px clamp(12px, 2vw, 28px) 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--bg);
}
.ah {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ah .brand {
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.comp-title {
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  color: #fff;
  letter-spacing: 0.04em;
}
.panel-tag {
  background: rgba(4, 105, 239, 0.2);
  color: var(--cyan);
  border: 1px solid rgba(2, 201, 251, 0.4);
  font-size: 11px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.1em;
}
.grow {
  flex: 1;
}
.badge {
  font-size: 12px;
  font-weight: 900;
  padding: 3px 10px;
  border-radius: 4px;
  letter-spacing: 0.08em;
}
.badge.online {
  background: #0b8045;
  color: #fff;
}
.badge.offline {
  background: var(--coral);
  color: #fff;
}
.badge.firebase {
  background: #0b8045;
  color: #fff;
}
.badge.local {
  background: var(--cyan);
  color: #061426;
}

.sync-tool {
  border-color: rgba(4, 105, 239, 0.45);
  background: linear-gradient(180deg, #18233d, #11172a);
}
.sync-status-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #090e1a;
  border: 1px solid var(--line);
  padding: 10px 14px;
  border-radius: 6px;
}
.sync-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.sync-label {
  color: var(--muted);
  font-weight: 600;
}
.sync-val {
  font-weight: 700;
  color: var(--coral);
}
.sync-val.ok {
  color: var(--green);
}
.code-val {
  color: var(--cyan);
  font-family: monospace;
  font-weight: 900;
}
.code-input {
  font-family: monospace;
  font-size: 13px;
  color: var(--cyan);
  background: #090e1a;
}
.link-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.change-room-box {
  border-top: 1px dashed var(--line);
  padding-top: 10px;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 8px var(--green);
}
.dot.off {
  background: var(--coral);
}
.email {
  font-size: 14px;
}

.control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  flex-wrap: wrap;
  border-left: 5px solid var(--blue);
  background: var(--panel);
}
.lbl {
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.1em;
  color: var(--cyan);
}
.screens {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--line);
}
.tabs button {
  background: none;
  border: 0;
  color: var(--muted);
  padding: 10px 20px;
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  font-size: 16px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.tabs button:hover {
  color: #fff;
}
.tabs button.on {
  color: #fff;
  border-color: var(--cyan);
}

/* Tie alert banner */
.tie-alert {
  padding: 16px 20px;
  background: rgba(251, 67, 37, 0.12);
  border: 2px solid var(--coral);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tie-alert-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.warn-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--coral);
  box-shadow: 0 0 10px var(--coral);
}
.tie-title {
  margin: 0;
  color: var(--coral);
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.05em;
}
.tie-desc {
  margin: 0;
  font-size: 14px;
  color: #fff;
}
.tie-team-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.tie-team-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #0f1526;
  border: 1px solid var(--line);
  padding: 8px 14px;
  border-radius: 6px;
}
.badge-pos {
  font-weight: 900;
  font-style: italic;
  background: var(--panel-2);
  padding: 2px 8px;
  border-radius: 4px;
}
.t-name {
  font-weight: 700;
  font-size: 16px;
  flex: 1;
}
.t-score {
  font-weight: 900;
  color: var(--cyan);
}
.tie-btn-group {
  display: flex;
  gap: 6px;
}

/* Finalist Manager */
.finalist-manager {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.fm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.fm-header h4 {
  margin: 0 0 4px;
  font-style: italic;
  text-transform: uppercase;
  color: var(--cyan);
}
.fm-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.counter {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  background: #090e1a;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--line);
}
.counter.ok {
  color: var(--green);
  border-color: var(--green);
}

.teams-table-scroll {
  max-height: 380px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg-2);
}
.teams-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.teams-table th {
  background: #11182c;
  padding: 10px 12px;
  text-align: left;
  font-weight: 900;
  font-style: italic;
  color: var(--cyan);
  border-bottom: 2px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 2;
}
.teams-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
}
.teams-table tr.selected {
  background: rgba(4, 105, 239, 0.12);
}
.teams-table tr.eliminated {
  opacity: 0.82;
}
.chk-box {
  width: 18px;
  height: 18px;
  accent-color: var(--blue);
  cursor: pointer;
}
.text-center {
  text-align: center;
}
.tbl-pos {
  display: inline-block;
  padding: 2px 6px;
  font-weight: 900;
  font-style: italic;
  border-radius: 4px;
  background: #1c2742;
  color: var(--muted);
}
.tbl-pos.top {
  background: var(--blue);
  color: #fff;
}
.tbl-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.tbl-score {
  font-weight: 900;
  font-size: 16px;
  color: #fff;
}
.tbl-status-badge {
  font-size: 11px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}
.status-q {
  background: rgba(0, 210, 106, 0.2);
  color: var(--green);
  border: 1px solid rgba(0, 210, 106, 0.4);
}
.status-out {
  background: #1c2338;
  color: var(--muted);
  border: 1px solid var(--line);
}
.tie-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.prio-val {
  min-width: 20px;
  text-align: center;
  font-size: 12px;
  color: var(--cyan);
}

/* Winner Card (Item 3) */
.winner-card {
  border-color: rgba(255, 207, 63, 0.4);
  background: linear-gradient(180deg, #18223d, #11182c);
}
.podium-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #090e1a;
  border: 1px solid var(--line);
  padding: 12px;
  border-radius: 8px;
  margin: 6px 0;
}
.preview-title {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: var(--gold);
}
.podium-preview-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #131c33;
}
.preview-badge {
  font-weight: 900;
  font-style: italic;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
}
.rank-1 .preview-badge {
  background: var(--gold);
  color: #111;
}
.rank-2 .preview-badge {
  background: var(--silver);
  color: #111;
}
.rank-3 .preview-badge {
  background: var(--bronze);
  color: #fff;
}
.preview-name {
  font-weight: 900;
  font-style: italic;
  flex: 1;
}
.preview-score {
  font-weight: 900;
  color: var(--cyan);
}
.preview-mode {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  background: #070a12;
  padding: 2px 6px;
  border-radius: 4px;
}

.final-tools,
.settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 14px;
}
.tool {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tool h4 {
  margin: 0;
  font-style: italic;
  text-transform: uppercase;
  color: var(--cyan);
}
.tool label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.small {
  font-size: 13px;
  margin: 0;
}
.inline {
  display: flex;
  gap: 8px;
  align-items: center;
}
.inline.wrap {
  flex-wrap: wrap;
}
.ok {
  color: var(--green);
  font-weight: 700;
}
.crown {
  margin-top: 4px;
}
.crown.active {
  background: #735100;
  border-color: var(--gold);
  color: #fff;
}
.danger {
  border-color: #631922;
}
code {
  background: #090e1a;
  padding: 3px 8px;
  border-radius: 4px;
  color: var(--cyan);
  width: fit-content;
  font-family: monospace;
}
</style>
