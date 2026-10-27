import { ref } from 'vue'
import { backend } from '../lib/backend'
import { hashPin } from '../lib/hash'

const PIN_OK = 'lcc_pin_ok'
const user = ref(null)
const ready = ref(false)
const pinOk = ref(sessionStorage.getItem(PIN_OK) === '1')
let resolveReady
const readyPromise = new Promise((r) => (resolveReady = r))

backend.onAuth((u) => {
  user.value = u
  if (!u) {
    pinOk.value = false
    sessionStorage.removeItem(PIN_OK)
  }
  ready.value = true
  resolveReady()
})

export function useAuth() {
  return {
    user,
    ready,
    pinOk,
    waitReady: () => readyPromise,
    login: (email, pw) => backend.login(email, pw),
    async logout() {
      sessionStorage.removeItem(PIN_OK)
      pinOk.value = false
      await backend.logout()
    },
    /** Returns stored hash (null when not set yet). Throws if not an admin. */
    getPinHash: () => backend.getPinHash(),
    async setPin(pin) {
      await backend.setPinHash(hashPin(pin))
    },
    async verifyPin(pin) {
      const h = await backend.getPinHash()
      const ok = !!h && h === hashPin(pin)
      if (ok) {
        pinOk.value = true
        sessionStorage.setItem(PIN_OK, '1')
        await backend.initIfEmpty()
      }
      return ok
    },
  }
}
