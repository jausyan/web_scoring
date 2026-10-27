import { hashPin } from '../hash'

/**
 * Local backend: saves state as JSON in both `data/scores.json` (via `/api/scores`
 * when running Vite dev/preview server) and `localStorage` (`lcc_state_v1`),
 * and syncs across tabs (`storage` event) and across LAN laptops (`/api/scores/stream` SSE).
 */
const KEY = 'lcc_state_v1'
const PIN_KEY = 'lcc_pin_hash'
const USER_KEY = 'lcc_local_user'

const EMAIL = import.meta.env.VITE_LOCAL_ADMIN_EMAIL || 'admin@lcc.id'
const PASSWORD = import.meta.env.VITE_LOCAL_ADMIN_PASSWORD || 'lcc2026'
const PIN = import.meta.env.VITE_LOCAL_PIN || '1234'

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))

function getPath(obj, path) {
  return path.split('/').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}
function setPath(obj, path, val) {
  const parts = path.split('/')
  let o = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {}
    o = o[parts[i]]
  }
  const last = parts.at(-1)
  if (val === null || val === undefined) delete o[last]
  else o[last] = val
}
function resolveNow(v, now) {
  if (v && typeof v === 'object') {
    if (v.__now) return now
    if (Array.isArray(v)) return v.map((x) => resolveNow(x, now))
    const o = {}
    for (const [k, x] of Object.entries(v)) o[k] = resolveNow(x, now)
    return o
  }
  return v
}

export async function syncJsonToDisk(state) {
  if (!state) return
  try {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    })
  } catch {
    // Ignore when hosted on static CDN (e.g. Netlify without local dev middleware)
  }
}

export function createLocalBackend(defaultState) {
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
  }
  let state = load()
  let user = JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
  const subs = new Set()
  const authSubs = new Set()
  const connSubs = new Set()

  const emit = () => subs.forEach((cb) => cb(clone(state)))
  const save = (pushToServer = true) => {
    localStorage.setItem(KEY, JSON.stringify(state))
    emit()
    if (pushToServer) syncJsonToDisk(state)
  }

  // Initial load from data/scores.json if available on server
  fetch('/api/scores')
    .then((r) => (r.ok ? r.json() : null))
    .then((diskState) => {
      if (diskState && typeof diskState === 'object') {
        state = diskState
        localStorage.setItem(KEY, JSON.stringify(state))
        emit()
      } else if (state) {
        syncJsonToDisk(state)
      } else {
        state = defaultState()
        save(true)
      }
    })
    .catch(() => {
      if (!state) {
        state = defaultState()
        save(false)
      }
    })

  // Listen for real-time updates from `data/scores.json` via SSE
  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource('/api/scores/stream')
      es.onmessage = (ev) => {
        try {
          const incoming = JSON.parse(ev.data)
          if (incoming && typeof incoming === 'object') {
            state = incoming
            localStorage.setItem(KEY, JSON.stringify(state))
            emit()
          }
        } catch {}
      }
      es.onopen = () => connSubs.forEach((cb) => cb(true))
    } catch {}
  }

  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { state = load(); emit() }
  })

  return {
    mode: 'local',
    credentialsHint: { email: EMAIL, password: PASSWORD, pin: PIN },
    subscribe(cb) {
      subs.add(cb)
      cb(clone(state))
      return () => subs.delete(cb)
    },
    onConnection(cb) {
      connSubs.add(cb)
      cb(true)
      return () => connSubs.delete(cb)
    },
    async update(updates) {
      if (!state) state = defaultState()
      const now = Date.now()
      for (const [k, v] of Object.entries(updates)) {
        if (v && typeof v === 'object' && '__inc' in v) setPath(state, k, (Number(getPath(state, k)) || 0) + v.__inc)
        else setPath(state, k, clone(resolveNow(v, now)))
      }
      save(true)
    },
    newKey() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    },
    async initIfEmpty() {
      if (!state) { state = defaultState(); save(true) }
    },
    async replaceAll(s) { state = clone(s); save(true) },
    async login(email, password) {
      if (email.trim().toLowerCase() === EMAIL.toLowerCase() && password === PASSWORD) {
        user = { uid: 'local-admin', email: EMAIL }
        sessionStorage.setItem(USER_KEY, JSON.stringify(user))
        authSubs.forEach((cb) => cb(user))
        return user
      }
      const err = new Error('Email atau kata sandi salah')
      err.code = 'auth/invalid-credential'
      throw err
    },
    async logout() {
      user = null
      sessionStorage.removeItem(USER_KEY)
      authSubs.forEach((cb) => cb(null))
    },
    onAuth(cb) {
      authSubs.add(cb)
      queueMicrotask(() => cb(user))
      return () => authSubs.delete(cb)
    },
    async getPinHash() {
      return localStorage.getItem(PIN_KEY) || hashPin(PIN)
    },
    async setPinHash(h) { localStorage.setItem(PIN_KEY, h) },
  }
}
