/**
 * Rank teams: highest score first. Tie-break: whoever reached that score
 * earlier (lower lastAt), then original team order.
 */
export function rankTeams(teams = {}) {
  return Object.entries(teams)
    .map(([id, t]) => ({ id, ...t, score: Number(t.score) || 0 }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.lastAt || 0) - (b.lastAt || 0) ||
        (a.order || 0) - (b.order || 0),
    )
    .map((t, i) => ({ ...t, pos: i + 1 }))
}

export function sortedByOrder(teams = {}) {
  return Object.entries(teams)
    .map(([id, t]) => ({ id, ...t, score: Number(t.score) || 0 }))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function sortedRounds(rounds = {}) {
  return Object.entries(rounds)
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function activeRoundOf(stageData) {
  const rounds = stageData?.rounds || {}
  const id = rounds[stageData?.activeRound] ? stageData.activeRound : sortedRounds(rounds)[0]?.id
  return id ? { id, ...rounds[id] } : { id: null, name: '—', plus: 1, minus: 1 }
}

export const fmtDelta = (n) => (n > 0 ? `+${n}` : `${n}`)
