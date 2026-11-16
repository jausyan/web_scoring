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
  'wss://test.mosquitto.org:8081/mqtt',
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

  // ── Sync model ───────────────────────────────────────────────────────────
  // • Every change is a delta with a unique id, sent through ALL brokers at once.
  //   Each laptop applies an id exactly once (dedupe), so one flaky broker
  //   can't split laptops apart, and duplicates can't double-count.
  // • The retained full snapshot is ONLY used to bootstrap after (re)connect.
  //   It never overwrites live state afterwards (that's what used to eat taps).
  let synced = false
  let bootstrapTimer = null
  let pickTimer = null
  let bestSnapshot = null
  const early = [] // deltas from others that arrived before bootstrap
  const pending = new Map() // own deltas not yet echoed back by any broker
  const seen = new Set()
  const seenOrder = []
  const markSeen = (id) => {
    if (!id || seen.has(id)) return false
    seen.add(id)
    seenOrder.push(id)
    if (seenOrder.length > 3000) seen.delete(seenOrder.shift())
    return true
  }
  let msgSeq = 0
  const newMsgId = () => `${clientId}.${Date.now().toString(36)}.${(msgSeq++).toString(36)}`

  const applyUpdates = (updates, now) => {
    for (const [k, v] of Object.entries(updates)) {
      if (v && typeof v === 'object' && '__inc' in v) {
        setPath(state, k, (Number(getPath(state, k)) || 0) + v.__inc)
      } else {
        setPath(state, k, clone(resolveNow(v, now)))
      }
    }
  }

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

  // ── Broker connections (all in parallel) ────────────────────────────────
  const conns = BROKER_URLS.map((url) => ({ url, client: null, up: false }))
  const anyUp = () => conns.some((c) => c.up)

  function refreshConn() {
    const up = anyUp()
    if (!up) {
      synced = false
      bestSnapshot = null
      clearTimeout(bootstrapTimer)
      clearTimeout(pickTimer)
      bootstrapTimer = pickTimer = null
    }
    setConnected(up)
  }

  function pubAll(topic, payload, retain = false) {
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload)
    for (const c of conns) {
      if (!c.up || !c.client) continue
      try {
        c.client.publish(topic, msg, { qos: 1, retain })
      } catch (e) {
        console.error('[LCC Realtime] publish error:', c.url, e)
      }
    }
  }

  function connectBroker(conn, i) {
    try {
      const client = mqtt.connect(conn.url, {
        clientId: `${clientId}_${i}`,
        clean: true,
        connectTimeout: 15000,
        reconnectPeriod: 3000,
        keepalive: 30,
      })
      conn.client = client

      client.on('connect', () => {
        conn.up = true
        refreshConn()
        client.subscribe([TOPIC_STATE, TOPIC_UPDATE, TOPIC_PIN], { qos: 1 }, (err) => {
          if (err) return console.error('[LCC Realtime] Subscribe error:', conn.url, err)
          if (!synced) {
            if (!bootstrapTimer) bootstrapTimer = setTimeout(() => finishBootstrap(bestSnapshot), 2500)
            return
          }
          // Already live via another broker: resend unconfirmed taps + refresh this broker's snapshot.
          for (const [id, p] of pending) {
            try {
              client.publish(TOPIC_UPDATE, JSON.stringify({ id, senderId: clientId, updates: p.updates, ts: p.ts }), { qos: 1 })
            } catch {}
          }
          publishFullState()
        })
      })

      client.on('message', handleMessage)

      const down = () => {
        if (conn.up) {
          conn.up = false
          refreshConn()
        }
      }
      client.on('offline', down)
      client.on('close', down)
      client.on('error', (err) => {
        console.warn(`[LCC Realtime] Broker ${conn.url} error:`, err?.message || err)
        down()
      })
    } catch (e) {
      console.warn('[LCC Realtime] connect failed:', conn.url, e)
    }
  }

  function handleMessage(topic, payload) {
    try {
      const text = payload.toString()
      if (!text) return

      if (topic === TOPIC_PIN) {
        remotePinHash = text.trim()
        storage.set(PIN_KEY, remotePinHash)
        return
      }

      if (topic === TOPIC_STATE) {
        if (synced) return
        const incoming = JSON.parse(text)
        if (!incoming || typeof incoming !== 'object' || !incoming.quarter) return
        // Brokers may hold snapshots of different age: pick the freshest one.
        if (!bestSnapshot || (incoming._ts || 0) > (bestSnapshot._ts || 0)) bestSnapshot = incoming
        if (!pickTimer) pickTimer = setTimeout(() => finishBootstrap(bestSnapshot), 700)
        return
      }

      if (topic === TOPIC_UPDATE) {
        const data = JSON.parse(text)
        if (!data) return
        if (data.senderId === clientId) {
          if (data.id) pending.delete(data.id) // confirmed by a broker
          return
        }
        if (data.id && !markSeen(data.id)) return // already applied via another broker

        // Explicit full replacement (reset / JSON import / force sync)
        if (data.replace && typeof data.replace === 'object' && data.replace.quarter) {
          if (!synced) return finishBootstrap(data.replace)
          state = stripMeta(data.replace)
          saveLocal()
          return
        }

        if (!data.updates) return
        if (!synced) {
          early.push({ id: data.id, updates: data.updates, ts: data.ts || Date.now() })
          return
        }
        if (!state) state = defaultState()
        applyUpdates(data.updates, data.ts || Date.now())
        saveLocal()
        // Every laptop refreshes the snapshot so the last one written has ALL deltas.
        publishFullState()
      }
    } catch (e) {
      console.error('[LCC Realtime] Message handle error:', e)
    }
  }

  function stripMeta(s) {
    const c = clone(s)
    if (c) {
      delete c._sender
      delete c._ts
      delete c._applied
    }
    return c
  }

  /** Once per (re)connect: adopt the freshest snapshot, then replay anything it doesn't include. */
  function finishBootstrap(incoming) {
    if (synced) return
    synced = true
    clearTimeout(bootstrapTimer)
    clearTimeout(pickTimer)
    bootstrapTimer = pickTimer = null
    bestSnapshot = null

    const applied = new Set(incoming?._applied || [])
    if (incoming) {
      state = stripMeta(incoming)
      for (const id of applied) markSeen(id)
    }
    if (!state) state = defaultState()

    // Others' deltas that raced the snapshot
    for (const d of early.splice(0)) if (!d.id || !applied.has(d.id)) applyUpdates(d.updates, d.ts)
    // Our own taps that the snapshot doesn't contain yet (e.g. made while offline)
    for (const [id, p] of pending) {
      if (applied.has(id)) pending.delete(id)
      else if (incoming) applyUpdates(p.updates, p.ts)
    }
    saveLocal()
    for (const [id, p] of pending) pubAll(TOPIC_UPDATE, { id, senderId: clientId, updates: p.updates, ts: p.ts })
    if (pending.size || !incoming) publishFullState()
  }

  // Start connections to every broker
  conns.forEach(connectBroker)

  // Listen for storage changes across tabs of same browser (only matters when offline;
  // while connected every tab receives the deltas itself).
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STATE_KEY && !isConnected) {
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
          state = stripMeta(diskState)
          saveLocal()
        }
      })
      .catch(() => {})
  }

  // Listen for local LAN Server-Sent Events (fallback for offline LAN)
  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource('/api/scores/stream')
      es.onmessage = (ev) => {
        // LAN fallback only: while MQTT is live it is the source of truth.
        if (isConnected) return
        try {
          const incoming = JSON.parse(ev.data)
          if (incoming && typeof incoming === 'object' && incoming.quarter) {
            state = stripMeta(incoming)
            storage.set(STATE_KEY, JSON.stringify(state))
            emit()
          }
        } catch {}
      }
    } catch {}
  }

  let publishTimer = null
  function publishFullState() {
    if (!anyUp() || !synced) return
    clearTimeout(publishTimer)
    // Snapshot is only for laptops that join/reload later; debounce so a burst of taps sends one.
    publishTimer = setTimeout(() => {
      if (!state) return
      pubAll(TOPIC_STATE, { ...state, _sender: clientId, _ts: Date.now(), _applied: seenOrder.slice(-500) }, true)
    }, 600 + Math.floor(Math.random() * 600))
  }

  function publishDelta(updates, now) {
    const id = newMsgId()
    markSeen(id)
    pending.set(id, { updates: clone(updates), ts: now })
    // If not live yet, it stays pending and is replayed after bootstrap.
    if (synced) pubAll(TOPIC_UPDATE, { id, senderId: clientId, updates, ts: now })
  }

  function publishReplace() {
    if (!state) return
    pubAll(TOPIC_UPDATE, { id: newMsgId(), senderId: clientId, replace: state, ts: Date.now() })
    publishFullState()
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
      applyUpdates(updates, now)
      saveLocal()
      publishDelta(updates, now)
      publishFullState()
    },

    newKey() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    },

    async initIfEmpty() {
      if (!state) {
        state = defaultState()
        saveLocal()
        publishFullState()
      }
    },

    async replaceAll(s) {
      state = clone(s)
      pending.clear()
      saveLocal()
      publishReplace()
    },

    /** Force broadcast current state to all connected devices (overwrites theirs) */
    forceSync() {
      if (state) publishReplace()
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
      pubAll(TOPIC_PIN, h, true)
    },
  }
}
