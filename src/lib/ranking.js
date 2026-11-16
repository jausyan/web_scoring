/**
 * Rank teams: highest score first.
 * Tie-break priority:
 * 1. Score (descending)
 * 2. tiePriority (descending, manual admin resolution when scores tie)
 * 3. lastAt (who reached score earlier)
 * 4. original team order
 */
export function rankTeams(teams = {}) {
  return Object.entries(teams)
    .map(([id, t]) => ({ id, ...t, score: Number(t.score) || 0 }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (Number(b.tiePriority) || 0) - (Number(a.tiePriority) || 0) ||
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

/**
 * Detect teams with identical scores.
 * Returns array of tie groups: [{ score: 80, count: 2, teams: [...] }]
 */
export function findTiedGroups(teams = {}, cutoff = 5) {
  const c = Math.max(1, Number(cutoff) || 5)
  const ranked = rankTeams(teams)
  const map = {}
  for (const t of ranked) {
    if (!map[t.score]) map[t.score] = []
    map[t.score].push(t)
  }
  return Object.entries(map)
    .filter(([, list]) => list.length > 1)
    .map(([score, list]) => ({
      score: Number(score),
      count: list.length,
      teams: list,
      // Check if this tie spans across the cutoff (pos <= cutoff and pos > cutoff)
      spansCutoff: list.some((t) => t.pos <= c) && list.some((t) => t.pos > c),
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Compute podium order:
 * Winner (Juara 1) is chosen manually by admin.
 * Juara 2 & Juara 3 are automatically sorted by score from the remaining final teams.
 */
export function computeFinalPodium(teams = {}, manualWinnerId = null) {
  const ranked = rankTeams(teams)
  if (!manualWinnerId || !teams[manualWinnerId]) {
    // If no manual winner, default to top 3 by score
    return ranked.slice(0, 3).map((t) => t.id)
  }
  const remaining = ranked.filter((t) => t.id !== manualWinnerId)
  const p1 = manualWinnerId
  const p2 = remaining[0]?.id || null
  const p3 = remaining[1]?.id || null
  return [p1, p2, p3].filter(Boolean)
}
