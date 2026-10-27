import { rankTeams, sortedRounds } from './ranking'
import { withDefaults } from './defaultState'
import { backend } from './backend'

function escCsv(val) {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows) {
  // Include UTF-8 BOM (\uFEFF) so Microsoft Excel opens Indonesian text & symbols properly
  return '\uFEFF' + rows.map((r) => r.map(escCsv).join(',')).join('\r\n')
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function fmtTime(ts) {
  if (!ts || Number(ts) <= 0) return '-'
  try {
    return new Date(Number(ts)).toLocaleString('id-ID')
  } catch {
    return '-'
  }
}

function dateSlug() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** Calculate per-round score totals for each team from state.log */
function roundBreakdown(state, stage) {
  const map = {}
  for (const entry of Object.values(state.log || {})) {
    if (entry?.stage !== stage || !entry.teamId || !entry.roundId) continue
    if (!map[entry.teamId]) map[entry.teamId] = {}
    map[entry.teamId][entry.roundId] = (map[entry.teamId][entry.roundId] || 0) + (Number(entry.delta) || 0)
  }
  return map
}

function buildStageRows(state, stage) {
  const stageData = state[stage] || {}
  const rounds = sortedRounds(stageData.rounds)
  const ranked = rankTeams(stageData.teams)
  const byRound = roundBreakdown(state, stage)
  const podium = state.final?.podium || []

  const header = [
    'Peringkat',
    'No Tim',
    'ID Tim',
    'Nama Tim',
    ...rounds.map((r) => `${r.name} (+${r.plus}/-${r.minus})`),
    'Total Skor',
    stage === 'quarter' ? 'Status Kualifikasi' : 'Status Juara',
    'Waktu Skor Terakhir',
  ]

  const rows = [header]
  for (const t of ranked) {
    let status = '-'
    if (stage === 'quarter') {
      status = t.pos <= 5 ? 'LOLOS GRAND FINAL' : 'TERELIMINASI'
    } else {
      const pIdx = podium.indexOf(t.id)
      const place = pIdx !== -1 ? pIdx + 1 : t.pos
      status = place === 1 ? 'JUARA 1' : place === 2 ? 'JUARA 2' : place === 3 ? 'JUARA 3' : `FINALIS P${t.pos}`
    }

    rows.push([
      t.pos,
      t.number ?? t.order ?? '',
      t.id,
      t.name,
      ...rounds.map((r) => byRound[t.id]?.[r.id] ?? 0),
      t.score,
      status,
      fmtTime(t.lastAt),
    ])
  }
  return rows
}

/** Download Quarterfinal scores as CSV */
export function downloadQuarterCsv(state) {
  const rows = buildStageRows(state, 'quarter')
  triggerDownload(toCsv(rows), `skor-perempat-final_${dateSlug()}.csv`, 'text/csv;charset=utf-8;')
}

/** Download Grand Final scores as CSV */
export function downloadFinalCsv(state) {
  const rows = buildStageRows(state, 'final')
  triggerDownload(toCsv(rows), `skor-grand-final_${dateSlug()}.csv`, 'text/csv;charset=utf-8;')
}

/** Download combined CSV (Quarterfinal + Grand Final + Score History Log) */
export function downloadAllScoresCsv(state) {
  const qRows = buildStageRows(state, 'quarter')
  const fRows = buildStageRows(state, 'final')

  const logEntries = Object.entries(state.log || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, e], idx) => {
      const stageLabel = e.stage === 'final' ? 'Grand Final' : 'Perempat Final'
      const teamName = state[e.stage]?.teams?.[e.teamId]?.name || e.teamId
      const roundName = state[e.stage]?.rounds?.[e.roundId]?.name || e.roundId || '-'
      return [idx + 1, fmtTime(e.at), stageLabel, roundName, teamName, e.delta > 0 ? `+${e.delta}` : e.delta, key]
    })

  const allRows = [
    [state.meta?.title || 'LCC 2026', state.meta?.subtitle || ''],
    ['Waktu Ekspor', new Date().toLocaleString('id-ID')],
    [],
    ['=== KLASEMEN PEREMPAT FINAL (20 TIM) ==='],
    ...qRows,
    [],
    ['=== KLASEMEN GRAND FINAL (5 TIM) ==='],
    ...fRows,
    [],
    ['=== RIWAYAT PERUBAHAN SKOR (LOG) ==='],
    ['No', 'Waktu', 'Tahap', 'Babak', 'Nama Tim', 'Perubahan Poin', 'ID Log'],
    ...(logEntries.length ? logEntries : [['-', 'Belum ada riwayat perubahan skor', '', '', '', '', '']]),
  ]

  triggerDownload(toCsv(allRows), `skor-lengkap-lcc_${dateSlug()}.csv`, 'text/csv;charset=utf-8;')
}

/** Save / download full competition scores & configuration as JSON */
export function downloadScoresJson(state) {
  const payload = JSON.stringify(state, null, 2)
  triggerDownload(payload, `scores-lcc_${dateSlug()}.json`, 'application/json;charset=utf-8;')
}

/** Import / restore competition state from a JSON file */
export async function importScoresJson(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || (!parsed.quarter && !parsed.final)) {
    throw new Error('Format file JSON tidak valid untuk papan skor LCC.')
  }
  const normalized = withDefaults(parsed)
  await backend.replaceAll(normalized)
  return normalized
}
