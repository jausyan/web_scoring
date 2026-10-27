import { reactive, watch } from 'vue'

/**
 * Tracks score changes per team id → { delta, key } for ~1.6s
 * so views can flash rows and float "+5" chips.
 */
export function useScoreFlash(getTeams) {
  const flashes = reactive({})
  let prev = null
  watch(
    () => Object.fromEntries(Object.entries(getTeams() || {}).map(([id, t]) => [id, Number(t.score) || 0])),
    (now) => {
      if (prev) {
        for (const [id, s] of Object.entries(now)) {
          const d = s - (prev[id] ?? s)
          if (d !== 0) {
            const key = Date.now() + Math.random()
            flashes[id] = { delta: d, key }
            setTimeout(() => { if (flashes[id]?.key === key) delete flashes[id] }, 1600)
          }
        }
      }
      prev = now
    },
    { immediate: true },
  )
  return flashes
}
