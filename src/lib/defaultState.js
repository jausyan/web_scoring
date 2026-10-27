// Default competition data. Keyed objects (not arrays) so Firebase paths stay stable.

export const TEAM_COLORS = [
  '#e10600', // rosso
  '#00d2be', // teal
  '#ff8700', // papaya
  '#3671c6', // blue
  '#ffd400', // yellow
  '#27f4d2', // mint
  '#b6babd', // silver
  '#52e252', // green
  '#ff87bc', // pink
  '#9b59ff', // purple
]

export const FINAL_COLORS = ['#e10600', '#00d2be', '#ff8700', '#3671c6', '#ffd400']

export const SCREENS = {
  'quarter-board': { label: 'PEREMPAT FINAL', short: 'Papan Skor' },
  'quarter-ranking': { label: 'KLASEMEN AKHIR', short: 'Klasemen' },
  'final-race': { label: 'GRAND FINAL', short: 'Balapan' },
  'final-podium': { label: 'PODIUM JUARA', short: 'Podium' },
}

const pad = (n) => String(n).padStart(2, '0')

export function defaultState() {
  const quarterTeams = {}
  for (let i = 1; i <= 20; i++) {
    quarterTeams[`t${pad(i)}`] = {
      name: `Tim ${i}`,
      order: i,
      color: TEAM_COLORS[(i - 1) % TEAM_COLORS.length],
      score: 0,
      lastAt: 0,
    }
  }
  const finalTeams = {}
  for (let i = 1; i <= 5; i++) {
    finalTeams[`f${i}`] = {
      name: `Finalis ${i}`,
      order: i,
      number: i,
      color: FINAL_COLORS[i - 1],
      score: 0,
      lastAt: 0,
    }
  }
  return {
    meta: { title: 'LCC 2026', subtitle: 'Lomba Cerdas Cermat · Grand Prix' },
    display: { screen: 'quarter-board', seq: 0 },
    quarter: {
      teams: quarterTeams,
      rounds: {
        r1: { name: 'Babak 1', plus: 5, minus: 2, order: 1 },
        r2: { name: 'Babak 2', plus: 10, minus: 3, order: 2 },
      },
      activeRound: 'r1',
    },
    final: {
      teams: finalTeams,
      rounds: {
        r1: { name: 'Babak 1', plus: 10, minus: 5, order: 1 },
        r2: { name: 'Babak Rebutan', plus: 20, minus: 10, order: 2 },
      },
      activeRound: 'r1',
      target: 100,
      podium: null,
      startSeq: 0,
    },
    log: {},
  }
}

/** Fill gaps (Firebase drops empty objects) so views never crash. */
export function withDefaults(s) {
  const d = defaultState()
  if (!s) return d
  return {
    ...d,
    ...s,
    meta: { ...d.meta, ...(s.meta || {}) },
    display: { ...d.display, ...(s.display || {}) },
    quarter: { ...d.quarter, ...(s.quarter || {}), teams: s.quarter?.teams || {}, rounds: s.quarter?.rounds || {} },
    final: { ...d.final, ...(s.final || {}), teams: s.final?.teams || {}, rounds: s.final?.rounds || {} },
    log: s.log || {},
  }
}
