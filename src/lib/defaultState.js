// Default competition data using color palette from color_ref.jpeg and EPW branding.

export const TEAM_COLORS = [
  '#0469ef', // Electric Royal Blue (color_ref 0469EF)
  '#02c9fb', // Sky Cyan (color_ref 02C9FB)
  '#fa186e', // Fuchsia Pink (color_ref FA186E)
  '#fb4325', // Electric Coral Red (color_ref FB4325)
  '#f69632', // Amber Orange (color_ref F69632)
  '#6a2cd7', // Deep Electric Purple (color_ref 6A2CD7)
  '#a66cf3', // Lavender Violet (color_ref A66CF3)
  '#a10d6f', // Deep Berry Magenta (color_ref A10D6F)
  '#00b1de', // Vivid Teal (color_ref shadow 00B1DE)
  '#ff8b13', // Warm Tangerine (color_ref shadow FF8B13)
  '#0046a4', // Deep Navy Blue (color_ref shadow 0046A4)
  '#c2004a', // Crimson Berry (color_ref shadow C2004A)
  '#540bd4', // Royal Violet (color_ref shadow 540BD4)
  '#cf2f14', // Rust Coral (color_ref shadow CF2F14)
  '#8935f7', // Bright Violet (color_ref shadow 8935F7)
  '#398cfa', // Cornflower Blue (color_ref highlight 398CFA)
  '#69d4ef', // Ice Cyan (color_ref highlight 69D4EF)
  '#ff99c0', // Soft Rose Pink (color_ref highlight FF99C0)
  '#ffca94', // Peach Orange (color_ref highlight FFCA94)
  '#c7a1f9', // Pastel Purple (color_ref highlight C7A1F9)
]

export const FINAL_COLORS = [
  '#0469ef', // Team 1: Electric Royal Blue
  '#02c9fb', // Team 2: Sky Cyan
  '#fa186e', // Team 3: Fuchsia Pink
  '#fb4325', // Team 4: Electric Coral
  '#f69632', // Team 5: Amber Orange
]

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
      tiePriority: 0,
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
    meta: {
      title: 'LCC EPW 2026',
      subtitle: 'Lomba Cerdas Cermat · Engineering Physics Week',
    },
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
      winnerManualId: null,
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
    quarter: {
      ...d.quarter,
      ...(s.quarter || {}),
      teams: s.quarter?.teams || {},
      rounds: s.quarter?.rounds || {},
    },
    final: {
      ...d.final,
      ...(s.final || {}),
      teams: s.final?.teams || {},
      rounds: s.final?.rounds || {},
    },
    log: s.log || {},
  }
}
