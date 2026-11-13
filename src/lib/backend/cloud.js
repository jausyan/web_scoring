import mqtt from 'mqtt'
import { hashPin } from '../hash.js'

const ROOM_STORAGE_KEY = 'lcc_room_id'
const PIN_KEY = 'lcc_pin_hash'
const USER_KEY = 'lcc_local_user'
const STATE_KEY = 'lcc_state_v1'

const EMAIL = import.meta?.env?.VITE_LOCAL_ADMIN_EMAIL || 'admin@lcc.id'
const PASSWORD = import.meta?.env?.VITE_LOCAL_ADMIN_PASSWORD || 'lcc2026'
const DEFAULT_PIN = import.meta?.env?.VITE_LOCAL_PIN || '1234'

// Highly reliable public MQTT over WebSocket brokers (SSL)
const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
]

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))

// Safe storage adapters that won't throw in Node, SSR, or private mode
const storage = {
  get(key) {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    } catch {
      return null
    }
  },
  set(key, val) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, val)
    } catch {}
  },
  remove(key) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    } catch {}
  },
}

const sessionStore = {
  get(key) {
    try {
      return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null
    } catch {
      return null
    }
  },
  set(key, val) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, val)
    } catch {}
  },
  remove(key) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key)
    } catch {}
  },
}

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

/** Check URL query params for ?room=xxx, otherwise read localStorage */
export function getActiveRoomId() {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search)
      const qRoom = params.get('room')
      if (qRoom && qRoom.trim()) {
        const cleaned = qRoom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
        storage.set(ROOM_STORAGE_KEY, cleaned)
        return cleaned
      }
    } catch {}
    const stored = storage.get(ROOM_STORAGE_KEY)
    if (stored && stored.trim()) return stored.trim()
  }
  return 'lcc_epw_2026'
}

export function setActiveRoomId(roomId) {
  const cleaned = (roomId || 'lcc_epw_2026').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  storage.set(ROOM_STORAGE_KEY, cleaned)
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.set('room', cleaned)
    window.history.replaceState({}, '', url.toString())
    window.location.reload()
  }
}

/** Optional LAN save to data/scores.json if running under Vite dev */
async function syncJsonToDisk(state) {
  if (!state || typeof fetch === 'undefined') return
  try {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    })
  } catch {}
}

/**
 * Cloud Realtime Backend using MQTT over WebSockets.
 * Synchronizes across multiple laptops, projector screens, phones, and Netlify
 * instantly with zero setup, zero API keys, and auto-broker failover.
 */
export function createCloudBackend(defaultState) {
  const clientId = 'lcc_' + Math.random().toString(36).substring(2, 10)
  const roomId = getActiveRoomId()

  const TOPIC_STATE = `lcc/room/${roomId}/state`
  const TOPIC_UPDATE = `lcc/room/${roomId}/update`
  const TOPIC_PIN = `lcc/room/${roomId}/pin`

  const load = () => {
    try {
      const raw = storage.get(STATE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  let state = load()
  let user = null
  try {
    const uRaw = sessionStore.get(USER_KEY)
    user = uRaw ? JSON.parse(uRaw) : null
  } catch {}

  let remotePinHash = null
  let isConnected = false
  let brokerIdx = 0
  let isConnecting = false

  const subs = new Set()
  const authSubs = new Set()
  const connSubs = new Set()

  const emit = () => {
    const s = clone(state)
    subs.forEach((cb) => {
      try { cb(s) } catch (e) { console.error(e) }
    })
  }

  const setConnected = (val) => {
    if (isConnected !== val) {
      isConnected = val
      connSubs.forEach((cb) => {
        try { cb(val) } catch (e) { console.error(e) }
      })
    }
  }

  const saveLocal = () => {
    if (state) {
      storage.set(STATE_KEY, JSON.stringify(state))
      emit()
      syncJsonToDisk(state)
    }
  }

  // Connect to MQTT Broker
  let client = null
  let reconnectTimer = null

  function connectMqtt() {
    if (isConnecting) return
    isConnecting = true

    const brokerUrl = BROKER_URLS[brokerIdx % BROKER_URLS.length]

    try {
      if (client) {
        try { client.end(true) } catch {}
      }

      client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 4000,
        keepalive: 30,
      })

      client.on('connect', () => {
        isConnecting = false
        setConnected(true)

        client.subscribe([TOPIC_STATE, TOPIC_UPDATE, TOPIC_PIN], { qos: 1 }, (err) => {
          if (err) {
            console.error('[LCC Realtime] Subscribe error:', err)
          } else {
            // If local state doesn't exist yet, we wait for retained message from broker.
            // If no message arrives after 1.5s and state is null, initialize with defaultState.
            if (!state) {
              setTimeout(() => {
                if (!state) {
                  state = defaultState()
                  saveLocal()
                  publishFullState(state, true)
                }
              }, 1500)
            }
          }
        })
      })

      client.on('message', (topic, payload) => {
        try {
          const text = payload.toString()
          if (!text) return

          if (topic === TOPIC_PIN) {
            remotePinHash = text.trim()
            storage.set(PIN_KEY, remotePinHash)
            return
          }

          if (topic === TOPIC_STATE) {
            const incoming = JSON.parse(text)
            if (incoming && typeof incoming === 'object' && incoming.quarter) {
              state = incoming
              saveLocal()
            }
            return
          }

          if (topic === TOPIC_UPDATE) {
            const data = JSON.parse(text)
            // Echo prevention: don't re-apply our own updates
            if (data && data.senderId === clientId) return

            if (data && data.updates && state) {
              const now = data.ts || Date.now()
              for (const [k, v] of Object.entries(data.updates)) {
                if (v && typeof v === 'object' && '__inc' in v) {
                  setPath(state, k, (Number(getPath(state, k)) || 0) + v.__inc)
                } else {
                  setPath(state, k, clone(resolveNow(v, now)))
                }
              }
              saveLocal()
            }
          }
        } catch (e) {
          console.error('[LCC Realtime] Message handle error:', e)
        }
      })

      client.on('offline', () => setConnected(false))
      client.on('close', () => setConnected(false))
      client.on('error', (err) => {
        console.warn(`[LCC Realtime] Broker ${brokerUrl} error:`, err?.message || err)
        setConnected(false)
        isConnecting = false

        // Failover to secondary broker
        clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(() => {
          brokerIdx++
          connectMqtt()
        }, 3000)
      })
    } catch (e) {
      isConnecting = false
      setConnected(false)
    }
  }

  // Start connection
  connectMqtt()

  // Listen for storage changes across tabs of same browser
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STATE_KEY) {
        state = load()
        emit()
      }
    })
  }

  // Initial disk load if running in local dev mode
  if (typeof fetch !== 'undefined') {
    fetch('/api/scores')
      .then((r) => (r.ok ? r.json() : null))
      .then((diskState) => {
        if (diskState && typeof diskState === 'object' && diskState.quarter && !state) {
          state = diskState
          saveLocal()
          publishFullState(state, true)
        }
      })
      .catch(() => {})
  }

  // Listen for local LAN Server-Sent Events (fallback for offline LAN)
  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource('/api/scores/stream')
      es.onmessage = (ev) => {
        try {
          const incoming = JSON.parse(ev.data)
          if (incoming && typeof incoming === 'object' && incoming.quarter) {
            state = incoming
            storage.set(STATE_KEY, JSON.stringify(state))
            emit()
            setConnected(true)
          }
        } catch {}
      }
      es.onopen = () => setConnected(true)
    } catch {}
  }

  let publishTimer = null
  function publishFullState(st, retain = true) {
    if (!client || !isConnected) return
    clearTimeout(publishTimer)
    publishTimer = setTimeout(() => {
      try {
        const payload = JSON.stringify(st)
        client.publish(TOPIC_STATE, payload, { qos: 1, retain })
      } catch (e) {
        console.error('[LCC Realtime] publish error:', e)
      }
    }, 150)
  }

  function publishDelta(updates, now) {
    if (!client || !isConnected) return
    try {
      const msg = JSON.stringify({ senderId: clientId, updates, ts: now })
      client.publish(TOPIC_UPDATE, msg, { qos: 1, retain: false })
    } catch (e) {
      console.error('[LCC Realtime] delta publish error:', e)
    }
  }

  return {
    mode: 'cloud',
    roomId,
    clientId,
    credentialsHint: { email: EMAIL, password: PASSWORD, pin: DEFAULT_PIN },

    subscribe(cb) {
      subs.add(cb)
      cb(clone(state || defaultState()))
      return () => subs.delete(cb)
    },

    onConnection(cb) {
      connSubs.add(cb)
      cb(isConnected)
      return () => connSubs.delete(cb)
    },

    async update(updates) {
      if (!state) state = defaultState()
      const now = Date.now()

      for (const [k, v] of Object.entries(updates)) {
        if (v && typeof v === 'object' && '__inc' in v) {
          setPath(state, k, (Number(getPath(state, k)) || 0) + v.__inc)
        } else {
          setPath(state, k, clone(resolveNow(v, now)))
        }
      }

      saveLocal()
      publishDelta(updates, now)
      publishFullState(state, true)
    },

    newKey() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    },

    async initIfEmpty() {
      if (!state) {
        state = defaultState()
        saveLocal()
        publishFullState(state, true)
      }
    },

    async replaceAll(s) {
      state = clone(s)
      saveLocal()
      publishFullState(state, true)
    },

    /** Force broadcast current state to all connected devices */
    forceSync() {
      if (state) {
        publishFullState(state, true)
      }
    },

    async login(email, password) {
      if (email.trim().toLowerCase() === EMAIL.toLowerCase() && password === PASSWORD) {
        user = { uid: 'cloud-admin', email: EMAIL }
        sessionStore.set(USER_KEY, JSON.stringify(user))
        authSubs.forEach((cb) => cb(user))
        return user
      }
      const err = new Error('Email atau kata sandi salah')
      err.code = 'auth/invalid-credential'
      throw err
    },

    async logout() {
      user = null
      sessionStore.remove(USER_KEY)
      authSubs.forEach((cb) => cb(null))
    },

    onAuth(cb) {
      authSubs.add(cb)
      queueMicrotask(() => cb(user))
      return () => authSubs.delete(cb)
    },

    async getPinHash() {
      return remotePinHash || storage.get(PIN_KEY) || hashPin(DEFAULT_PIN)
    },

    async setPinHash(h) {
      remotePinHash = h
      storage.set(PIN_KEY, h)
      if (client && isConnected) {
        client.publish(TOPIC_PIN, h, { qos: 1, retain: true })
      }
    },
  }
}
