import { reactive } from 'vue'

/**
 * Global F1 wipe transition.
 *   await cover(label)  → screen fully covered (swap content now)
 *   reveal()            → wipe out
 */
const t = reactive({ phase: 'idle', label: '', sub: '', run: 0 })
let coveredAt = 0
let coverPromise = null

const IN_MS = 620
const MIN_HOLD = 900

export function useTransition() {
  return t
}

export function cover(label, sub = '') {
  if (t.phase === 'covered' || t.phase === 'in') {
    t.label = label
    t.sub = sub
    return coverPromise || Promise.resolve()
  }
  t.label = label
  t.sub = sub
  t.run++
  t.phase = 'in'
  coverPromise = new Promise((res) =>
    setTimeout(() => {
      t.phase = 'covered'
      coveredAt = performance.now()
      res()
    }, IN_MS),
  )
  return coverPromise
}

export async function reveal() {
  if (coverPromise) await coverPromise
  if (t.phase !== 'covered') return
  const wait = Math.max(0, MIN_HOLD - (performance.now() - coveredAt))
  setTimeout(() => {
    t.phase = 'out'
    coverPromise = null
    setTimeout(() => {
      if (t.phase === 'out') t.phase = 'idle'
    }, 700)
  }, wait)
}

export async function play(label, sub, swap) {
  await cover(label, sub)
  swap?.()
  reveal()
}
