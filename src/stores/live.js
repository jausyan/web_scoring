import { ref } from 'vue'
import { backend } from '../lib/backend'
import { syncJsonToDisk } from '../lib/backend/local'
import { withDefaults } from '../lib/defaultState'

const state = ref(withDefaults(null))
const loaded = ref(false)
const connected = ref(true)
let started = false

/** Shared, real-time competition state (single subscription per tab). */
export function useLive() {
  if (!started) {
    started = true
    backend.subscribe((s) => {
      const normalized = withDefaults(s)
      state.value = normalized
      loaded.value = true
      try {
        localStorage.setItem('lcc_state_v1', JSON.stringify(normalized))
      } catch {}
      if (backend.mode === 'firebase') {
        syncJsonToDisk(normalized)
      }
    })
    backend.onConnection((c) => (connected.value = c))
  }
  return { state, loaded, connected, mode: backend.mode }
}
