import { ref } from 'vue'
import { backend } from '../lib/backend'
import { withDefaults } from '../lib/defaultState'

const state = ref(withDefaults(null))
const loaded = ref(false)
const connected = ref(false)
let started = false

/** Shared, real-time competition state (single subscription per tab). */
export function useLive() {
  if (!started) {
    started = true
    backend.subscribe((s) => {
      const normalized = withDefaults(s)
      state.value = normalized
      loaded.value = true
    })
    backend.onConnection((c) => {
      connected.value = c
    })
  }
  return {
    state,
    loaded,
    connected,
    mode: backend.mode,
    backend,
  }
}
