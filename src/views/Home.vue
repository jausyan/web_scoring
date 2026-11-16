<script setup>
import { computed } from 'vue'
import { useLive } from '../stores/live'
import CarSvg from '../components/CarSvg.vue'
import F1Icon from '../components/F1Icon.vue'

const { state, mode } = useLive()

const compTitle = computed(() => state.value.meta.title || 'LCC EPW 2026')

const links = computed(() => [
  {
    to: '/',
    code: 'LIVE',
    t: 'Layar Proyektor',
    d: 'Tampilan panggung utama — otomatis mengikuti layar yang diaktifkan juri.',
    icon: 'telemetry',
  },
  {
    to: '/perempat',
    code: 'QF',
    t: 'Perempat Final',
    d: 'Papan skor langsung 20 tim dan klasemen akhir kualifikasi.',
    icon: 'flag',
  },
  {
    to: '/final',
    code: 'GF',
    t: 'Grand Final',
    d: 'Balapan F1 finalis, garis finish, dan podium juara.',
    icon: 'car',
  },
  {
    to: '/admin',
    code: 'ADM',
    t: compTitle.value,
    d: 'Panel juri & admin: atur skor, babak, peserta final, dan tampilan.',
    icon: 'control',
  },
])
</script>

<template>
  <div class="home">
    <div class="hero">
      <div class="brand-row">
        <img src="/logo-epw.png" alt="Logo EPW" class="hero-logo" />
        <div class="kicker">ENGINEERING PHYSICS WEEK · GRAND PRIX</div>
      </div>
      <h1>{{ state.meta.title }}</h1>
      <p class="sub">{{ state.meta.subtitle }}</p>
      <div class="road">
        <div class="kerb strip" />
        <div class="asphalt">
          <div class="car">
            <CarSvg color="#0469ef" number="1" />
          </div>
        </div>
        <div class="kerb strip" />
      </div>
    </div>

    <div class="grid">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="tile card">
        <div class="tile-top">
          <span class="icon-box"><F1Icon :name="l.icon" :size="24" /></span>
          <span class="code">{{ l.code }}</span>
        </div>
        <span class="t">{{ l.t }}</span>
        <span class="d">{{ l.d }}</span>
      </RouterLink>
    </div>

    <div class="mode" :class="mode">
      <span class="status-dot" />
      <span v-if="mode === 'cloud'">
        Mode Realtime Multi-Perangkat (Cloud) — skor tersinkron otomatis antar laptop & perangkat
      </span>
      <span v-else-if="mode === 'firebase'">
        Mode Online (Firebase) — sinkronisasi real-time multi-laptop
      </span>
      <span v-else>
        Mode Lokal (JSON) — tersimpan otomatis di data/scores.json & browser
      </span>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  padding: 6vh 6vw;
  display: flex;
  flex-direction: column;
  gap: 5vh;
  background:
    radial-gradient(ellipse at 80% -10%, rgba(4, 105, 239, 0.22), transparent 50%),
    radial-gradient(ellipse at 20% 100%, rgba(2, 201, 251, 0.12), transparent 50%),
    var(--bg);
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}
.hero-logo {
  height: clamp(48px, 6vw, 76px);
  width: auto;
  filter: drop-shadow(0 4px 14px rgba(4, 105, 239, 0.5));
}
.kicker {
  font-weight: 900;
  font-style: italic;
  letter-spacing: 0.25em;
  color: var(--cyan);
  font-size: clamp(12px, 1.2vw, 18px);
}
h1 {
  margin: 6px 0 0;
  font-size: clamp(44px, 7.5vw, 120px);
  font-weight: 900;
  font-style: italic;
  line-height: 0.95;
  background: linear-gradient(135deg, #ffffff 40%, var(--cyan-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 10px 40px rgba(4, 105, 239, 0.4);
}
.sub {
  color: var(--muted);
  font-size: clamp(16px, 1.6vw, 24px);
  margin: 10px 0 0;
  font-weight: 600;
}
.road {
  margin-top: 4vh;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}
.strip {
  height: 10px;
}
.asphalt {
  height: 90px;
  background: #151b2c;
  position: relative;
}
.asphalt::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 3px dashed rgba(2, 201, 251, 0.35);
}
.car {
  position: absolute;
  top: 8px;
  width: 180px;
  animation: drive 5s linear infinite;
  z-index: 1;
}
@keyframes drive {
  from {
    left: -200px;
  }
  to {
    left: 100%;
  }
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}
.tile {
  position: relative;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  overflow: hidden;
  background: var(--panel);
}
.tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, var(--blue), var(--cyan));
}
.tile:hover {
  transform: translateY(-4px);
  border-color: var(--cyan);
  box-shadow: 0 10px 24px rgba(4, 105, 239, 0.25);
}
.tile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.icon-box {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(4, 105, 239, 0.15);
  border: 1px solid rgba(2, 201, 251, 0.3);
  color: var(--cyan);
  display: grid;
  place-items: center;
}
.code {
  font-weight: 900;
  font-style: italic;
  font-size: 13px;
  letter-spacing: 0.12em;
  color: var(--muted);
  background: #0d1220;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--line);
}
.t {
  font-weight: 900;
  font-style: italic;
  font-size: 22px;
  text-transform: uppercase;
}
.d {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.4;
}
.mode {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}
.mode.firebase {
  color: var(--green);
}
.mode.local {
  color: var(--cyan);
}
</style>
