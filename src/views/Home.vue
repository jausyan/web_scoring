<script setup>
import { useLive } from '../stores/live'
import CarSvg from '../components/CarSvg.vue'
import F1Icon from '../components/F1Icon.vue'

const { state, mode } = useLive()
const links = [
  { to: '/live', code: 'LIVE', t: 'Layar Live', d: 'Untuk proyektor — otomatis mengikuti layar yang dipilih admin.', icon: 'telemetry' },
  { to: '/perempat', code: 'QF', t: 'Perempat Final', d: 'Papan skor 20 tim & klasemen akhir.', icon: 'flag' },
  { to: '/final', code: 'GF', t: 'Grand Final', d: 'Balapan 5 finalis & podium juara.', icon: 'car' },
  { to: '/admin', code: 'RC', t: 'Race Control', d: 'Panel admin: atur skor, babak & tampilan.', icon: 'control' },
]
</script>

<template>
  <div class="home">
    <div class="hero">
      <div class="kicker"><span class="logo">LCC</span> GRAND PRIX</div>
      <h1>{{ state.meta.title }}</h1>
      <p class="sub">{{ state.meta.subtitle }}</p>
      <div class="road">
        <div class="kerb strip" />
        <div class="asphalt"><div class="car"><CarSvg color="#e10600" number="1" /></div></div>
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
      <span v-if="mode === 'firebase'">Mode Online (Firebase) — sinkron real-time antar perangkat</span>
      <span v-else>Mode Lokal (JSON) — tersimpan otomatis di data/scores.json & browser</span>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh; padding: 6vh 6vw; display: flex; flex-direction: column; gap: 5vh;
  background: radial-gradient(ellipse at 80% -10%, rgba(225, 6, 0, 0.25), transparent 50%), var(--bg);
}
.kicker { font-weight: 900; font-style: italic; letter-spacing: 0.3em; color: #ccc; }
.kicker .logo { background: var(--red); color: #fff; padding: 0 10px; letter-spacing: 0.05em; }
h1 { margin: 6px 0 0; font-size: clamp(48px, 8vw, 130px); font-weight: 900; font-style: italic; line-height: 0.95; }
.sub { color: var(--muted); font-size: clamp(16px, 1.6vw, 24px); margin: 8px 0 0; font-weight: 600; }
.road { margin-top: 4vh; overflow: hidden; border-radius: 6px; }
.strip { height: 10px; }
.asphalt { height: 90px; background: #2b2b33; position: relative; }
.asphalt::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 3px dashed rgba(255, 255, 255, 0.3); }
.car { position: absolute; top: 8px; width: 180px; animation: drive 5s linear infinite; z-index: 1; }
@keyframes drive { from { left: -200px; } to { left: 100%; } }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
.tile { position: relative; padding: 22px; display: flex; flex-direction: column; gap: 8px; transition: transform 0.15s, border-color 0.15s; overflow: hidden; }
.tile::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--red); }
.tile:hover { transform: translateY(-4px); border-color: var(--red); }
.tile-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.icon-box {
  width: 42px; height: 42px; border-radius: 6px; background: rgba(225, 6, 0, 0.14);
  border: 1px solid rgba(225, 6, 0, 0.4); color: var(--red); display: grid; place-items: center;
}
.code { font-weight: 900; font-style: italic; font-size: 13px; letter-spacing: 0.12em; color: var(--muted); background: #14141d; padding: 2px 8px; border-radius: 4px; }
.t { font-weight: 900; font-style: italic; font-size: 24px; text-transform: uppercase; }
.d { color: var(--muted); font-size: 14px; }
.mode { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 14px; font-weight: 600; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; background: currentColor; }
.mode.firebase { color: var(--green); }
.mode.local { color: var(--yellow); }
</style>
