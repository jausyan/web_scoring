<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import { backend } from '../lib/backend'
import F1Icon from '../components/F1Icon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuth()

const step = ref('login') // login | pin | setpin
const email = ref('')
const password = ref('')
const pin = ref('')
const pin2 = ref('')
const err = ref('')
const busy = ref(false)
const hint = backend.credentialsHint

const next = () => router.replace(route.query.next || '/admin')

async function toPinStep() {
  try {
    const h = await auth.getPinHash()
    step.value = h ? 'pin' : 'setpin'
  } catch (e) {
    console.error(e)
    err.value = 'Akun ini bukan admin. Tambahkan UID akun ke /admins di Firebase.'
    await auth.logout()
    step.value = 'login'
  }
}

onMounted(async () => {
  await auth.waitReady()
  if (auth.user.value) {
    if (auth.pinOk.value) return next()
    await toPinStep()
  }
})

async function doLogin() {
  err.value = ''
  busy.value = true
  try {
    await auth.login(email.value, password.value)
    await toPinStep()
  } catch (e) {
    err.value = 'Email atau kata sandi salah.'
  } finally {
    busy.value = false
  }
}

async function doPin() {
  err.value = ''
  busy.value = true
  try {
    if (step.value === 'setpin') {
      if (!/^\d{4,8}$/.test(pin.value)) throw new Error('PIN harus 4–8 digit angka.')
      if (pin.value !== pin2.value) throw new Error('Konfirmasi PIN tidak sama.')
      await auth.setPin(pin.value)
    }
    if (await auth.verifyPin(pin.value)) next()
    else throw new Error('PIN salah.')
  } catch (e) {
    err.value = e.message
    pin.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="wrap">
    <div class="box card">
      <div class="top kerb" />
      <div class="inner">
        <div class="brand big"><span class="logo">LCC</span> RACE CONTROL</div>
        <p class="muted">Pit lane — khusus panitia / admin</p>

        <form v-if="step === 'login'" @submit.prevent="doLogin">
          <label>Email admin<input v-model="email" class="input" type="email" autocomplete="username" required /></label>
          <label>Kata sandi<input v-model="password" class="input" type="password" autocomplete="current-password" required /></label>
          <button class="btn red lg" :disabled="busy">Masuk</button>
        </form>

        <form v-else @submit.prevent="doPin">
          <p v-if="step === 'setpin'" class="note">PIN belum dibuat. Buat PIN admin baru (4–8 digit).</p>
          <label>{{ step === 'setpin' ? 'PIN baru' : 'Masukkan PIN' }}
            <input v-model="pin" class="input pin" type="password" inputmode="numeric" maxlength="8" autofocus required />
          </label>
          <label v-if="step === 'setpin'">Ulangi PIN
            <input v-model="pin2" class="input pin" type="password" inputmode="numeric" maxlength="8" required />
          </label>
          <button class="btn red lg" :disabled="busy">
            <F1Icon name="control" :size="18" /> Buka Race Control
          </button>
          <button type="button" class="btn ghost sm" @click="auth.logout(); step = 'login'">Ganti Akun</button>
        </form>

        <p v-if="err" class="err">{{ err }}</p>
        <p v-if="hint" class="hint">
          Mode lokal (demo): <b>{{ hint.email }}</b> / <b>{{ hint.password }}</b> · PIN <b>{{ hint.pin }}</b>
        </p>
        <RouterLink to="/" class="back muted">Kembali ke Beranda</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh; display: grid; place-items: center; padding: 20px;
  background: radial-gradient(ellipse at 50% 0%, rgba(225, 6, 0, 0.25), transparent 60%), var(--bg);
}
.box { width: min(440px, 100%); overflow: hidden; }
.top { height: 10px; }
.inner { padding: 28px; display: flex; flex-direction: column; gap: 10px; }
.big { font-size: 28px; }
form { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; color: #ccc; font-size: 14px; }
.pin { font-size: 28px; letter-spacing: 0.5em; text-align: center; }
.err { color: #ff6b63; font-weight: 700; margin: 0; }
.note { color: var(--yellow); margin: 0; }
.hint { font-size: 13px; color: var(--muted); background: #12121a; padding: 8px 10px; border-radius: 6px; border: 1px dashed var(--line); }
.back { font-size: 14px; margin-top: 6px; font-weight: 600; }
.back:hover { color: #fff; }
</style>
