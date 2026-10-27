import { initializeApp } from 'firebase/app'
import {
  getDatabase, ref, onValue, update, increment, serverTimestamp,
  push, child, get, set, runTransaction,
} from 'firebase/database'
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

/** Translate our sentinel values ({__inc}, {__now}) into Firebase ones. */
function resolve(v) {
  if (v && typeof v === 'object') {
    if ('__inc' in v) return increment(v.__inc)
    if (v.__now) return serverTimestamp()
    if (Array.isArray(v)) return v.map(resolve)
    const o = {}
    for (const [k, x] of Object.entries(v)) o[k] = resolve(x)
    return o
  }
  return v
}

export function createFirebaseBackend(config, defaultState) {
  const app = initializeApp(config)
  const db = getDatabase(app)
  const auth = getAuth(app)
  const root = ref(db, 'lcc')

  return {
    mode: 'firebase',
    subscribe(cb) {
      return onValue(root, (s) => cb(s.val()), (e) => console.error('[firebase]', e))
    },
    onConnection(cb) {
      return onValue(ref(db, '.info/connected'), (s) => cb(!!s.val()))
    },
    async update(updates) {
      const u = {}
      for (const [k, v] of Object.entries(updates)) u[k] = resolve(v)
      await update(root, u)
    },
    newKey(path) {
      return push(child(root, path)).key
    },
    async initIfEmpty() {
      await runTransaction(root, (cur) => (cur === null ? defaultState() : undefined))
    },
    async replaceAll(state) {
      await set(root, state)
    },
    async login(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return { uid: cred.user.uid, email: cred.user.email }
    },
    logout: () => signOut(auth),
    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null))
    },
    /** Throws PERMISSION_DENIED if the account is not listed in /admins. */
    async getPinHash() {
      const s = await get(ref(db, 'adminPin'))
      return s.val()
    },
    async setPinHash(h) {
      await set(ref(db, 'adminPin'), h)
    },
  }
}
