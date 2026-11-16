import { createFirebaseBackend } from './firebase.js'
import { createCloudBackend } from './cloud.js'
import { defaultState } from '../defaultState.js'

const env = import.meta?.env || {}
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
 * Automatically uses Cloud Realtime Sync (MQTT WebSockets) by default.
 * Works seamlessly across separate laptops/phones without any setup or API keys.
 * If Firebase credentials are provided in env, switches to Firebase.
 */
export const backend =
  firebaseConfig.apiKey && firebaseConfig.databaseURL
    ? createFirebaseBackend(firebaseConfig, defaultState)
    : createCloudBackend(defaultState)
