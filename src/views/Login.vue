<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useLive } from '../stores/live'
import { backend } from '../lib/backend'
import F1Icon from '../components/F1Icon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const { state } = useLive()

const compTitle = computed(() => state.value?.meta?.title || 'LCC EPW 2026')

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
        <div class="login-brand">
          <img src="/logo-epw.png" alt="EPW" class="login-logo" />
          <div>
            <div class="title">{{ compTitle }}</div>
            <div class="subtitle">Panel Juri & Pengatur Skor</div>
          </div>
        </div>

        <form v-if="step === 'login'" @submit.prevent="doLogin">
          <label
            >Email Admin
            <input
              v-model="email"
              class="input"
              type="email"
              autocomplete="username"
              required
            />
          </label>
          <label
            >Kata Sandi
            <input
              v-model="password"
              class="input"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>
          <button class="btn blue lg" :disabled="busy">Masuk</button>
        </form>

        <form v-else @submit.prevent="doPin">
          <p v-if="step === 'setpin'" class="note">
            PIN belum dibuat. Buat PIN admin baru (4–8 digit).
          </p>
          <label
            >{{ step === 'setpin' ? 'PIN baru' : 'Masukkan PIN' }}
            <input
              v-model="pin"
              class="input pin"
              type="password"
              inputmode="numeric"
              maxlength="8"
              autofocus
              required
            />
          </label>
          <label v-if="step === 'setpin'"
            >Ulangi PIN
            <input
              v-model="pin2"
              class="input pin"
              type="password"
              inputmode="numeric"
              maxlength="8"
              required
            />
          </label>
          <button class="btn blue lg" :disabled="busy">
            <F1Icon name="control" :size="18" /> Buka Panel Skor
          </button>
          <button
            type="button"
            class="btn ghost sm"
            @click="
              auth.logout();
              step = 'login';
            "
          >
            Ganti Akun
          </button>
        </form>

        <p v-if="err" class="err">{{ err }}</p>
        <p v-if="hint" class="hint">
          Mode lokal (demo): <b>{{ hint.email }}</b> / <b>{{ hint.password }}</b> · PIN
          <b>{{ hint.pin }}</b>
        </p>
        <RouterLink to="/" class="back muted">← Kembali ke Layar Live</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(4, 105, 239, 0.25), transparent 60%),
    radial-gradient(ellipse at 80% 100%, rgba(2, 201, 251, 0.12), transparent 50%),
    var(--bg);
}
.box {
  width: min(450px, 100%);
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border-color: var(--line-strong);
}
.top {
  height: 10px;
}
.inner {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 6px;
}
.login-logo {
  height: 52px;
  width: auto;
  filter: drop-shadow(0 4px 10px rgba(4, 105, 239, 0.5));
}
.title {
  font-weight: 900;
  font-style: italic;
  font-size: 22px;
  line-height: 1.1;
  text-transform: uppercase;
}
.subtitle {
  color: var(--cyan);
  font-size: 13px;
  font-weight: 600;
}
form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 4px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
  color: #ccc;
  font-size: 14px;
}
.pin {
  font-size: 28px;
  letter-spacing: 0.5em;
  text-align: center;
}
.err {
  color: #ff6b63;
  font-weight: 700;
  margin: 0;
}
.note {
  color: var(--yellow);
  margin: 0;
  font-size: 14px;
}
.hint {
  font-size: 13px;
  color: var(--muted);
  background: #090e1a;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px dashed var(--line);
}
.back {
  font-size: 14px;
  margin-top: 6px;
  font-weight: 600;
  display: inline-block;
}
.back:hover {
  color: #fff;
}
</style>
