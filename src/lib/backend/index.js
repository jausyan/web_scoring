import { createFirebaseBackend } from './firebase'
import { createLocalBackend } from './local'
import { defaultState } from '../defaultState'

const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/**
 * Backend interface:
 *  subscribe(cb) · onConnection(cb) · update({path: value}) · newKey(path)
 *  initIfEmpty() · replaceAll(state) · login/logout/onAuth · getPinHash/setPinHash
 * Values may be {__inc: n} (atomic increment) or {__now: true} (timestamp).
 */
export const backend =
  firebaseConfig.apiKey && firebaseConfig.databaseURL
    ? createFirebaseBackend(firebaseConfig, defaultState)
    : createLocalBackend(defaultState)
