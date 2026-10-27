import { backend } from './backend'
import { rankTeams, sortedRounds } from './ranking'
import { defaultState, FINAL_COLORS } from './defaultState'

const INC = (n) => ({ __inc: n })
const NOW = { __now: true }

export function addScore(stage, teamId, delta, roundId = null) {
  delta = Number(delta)
  if (!delta || Number.isNaN(delta)) return
  const key = backend.newKey('log')
  return backend.update({
    [`${stage}/teams/${teamId}/score`]: INC(delta),
    [`${stage}/teams/${teamId}/lastAt`]: NOW,
    [`log/${key}`]: { stage, teamId, delta, roundId, at: NOW },
  })
}

export function lastLog(state) {
  const keys = Object.keys(state.log || {}).sort()
  const k = keys.at(-1)
  return k ? { key: k, ...state.log[k] } : null
}

export function undoLast(state) {
  const e = lastLog(state)
  if (!e) return
  return backend.update({
    [`${e.stage}/teams/${e.teamId}/score`]: INC(-e.delta),
    [`log/${e.key}`]: null,
  })
}

export const setActiveRound = (stage, id) => backend.update({ [`${stage}/activeRound`]: id })

export const saveRound = (stage, id, data) => {
  const u = {}
  for (const [k, v] of Object.entries(data)) u[`${stage}/rounds/${id}/${k}`] = v
  return backend.update(u)
}

export function addRound(stage, rounds) {
  const list = sortedRounds(rounds)
  const last = list.at(-1)
  const id = 'r' + Date.now().toString(36)
  return backend.update({
    [`${stage}/rounds/${id}`]: {
      name: `Babak ${list.length + 1}`,
      plus: last?.plus ?? 5,
      minus: last?.minus ?? 2,
      order: (last?.order ?? 0) + 1,
    },
  })
}

export const deleteRound = (stage, id) => backend.update({ [`${stage}/rounds/${id}`]: null })

export const setTeamField = (stage, id, field, value) =>
  backend.update({ [`${stage}/teams/${id}/${field}`]: value })

export function resetScores(state, stage) {
  const u = {}
  for (const id of Object.keys(state[stage].teams || {})) {
    u[`${stage}/teams/${id}/score`] = 0
    u[`${stage}/teams/${id}/lastAt`] = 0
  }
  for (const [k, e] of Object.entries(state.log || {})) if (e.stage === stage) u[`log/${k}`] = null
  if (stage === 'final') u['final/podium'] = null
  return backend.update(u)
}

export function promoteTop5(state) {
  const top = rankTeams(state.quarter.teams).slice(0, 5)
  const teams = {}
  top.forEach((t, i) => {
    teams[`f${i + 1}`] = {
      name: t.name,
      number: t.order,
      order: i + 1,
      sourceId: t.id,
      color: FINAL_COLORS[i],
      score: 0,
      lastAt: 0,
    }
  })
  const u = { 'final/teams': teams, 'final/podium': null }
  for (const [k, e] of Object.entries(state.log || {})) if (e.stage === 'final') u[`log/${k}`] = null
  return backend.update(u)
}

export const setScreen = (screen) =>
  backend.update({ 'display/screen': screen, 'display/seq': INC(1) })

export const startRace = () => backend.update({ 'final/startSeq': INC(1) })

export const setTarget = (n) => backend.update({ 'final/target': Math.max(1, Number(n) || 100) })

/** Lock in podium order (array of up to 3 team ids). */
export const setPodium = (ids) => backend.update({ 'final/podium': ids?.length ? ids : null })

/** Admin crowns a team: it becomes P1, the rest follow by score. */
export function crownTeam(state, id) {
  const rest = rankTeams(state.final.teams).map((t) => t.id).filter((x) => x !== id)
  return setPodium([id, ...rest].slice(0, 3))
}

export const setMeta = (meta) =>
  backend.update({ 'meta/title': meta.title, 'meta/subtitle': meta.subtitle })

export const resetAll = () => backend.replaceAll(defaultState())
