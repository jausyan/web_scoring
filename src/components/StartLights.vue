<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

/** F1 start-light sequence. Plays whenever `seq` increases after mount. */
const props = defineProps({ seq: { type: Number, default: 0 } })

const visible = ref(false)
const lit = ref(0)
const go = ref(false)
let timers = []
const clear = () => { timers.forEach(clearTimeout); timers = [] }
const at = (ms, fn) => timers.push(setTimeout(fn, ms))

function run() {
  clear()
  visible.value = true
  go.value = false
  lit.value = 0
  for (let i = 1; i <= 5; i++) at(i * 800, () => (lit.value = i))
  const out = 5 * 800 + 700 + Math.random() * 1300
  at(out, () => { lit.value = 0; go.value = true })
  at(out + 1800, () => (visible.value = false))
}

watch(() => props.seq, (n, o) => { if (o !== undefined && n > o) run() })
onBeforeUnmount(clear)
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="lights-wrap">
      <div class="gantry">
        <div v-for="i in 5" :key="i" class="col">
          <span class="lamp" :class="{ on: lit >= i }" />
          <span class="lamp" :class="{ on: lit >= i }" />
        </div>
      </div>
      <Transition name="pop"><div v-if="go" class="go">GO! GO! GO!</div></Transition>
    </div>
  </Transition>
</template>

<style scoped>
.lights-wrap {
  position: absolute; inset: 0; z-index: 50; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 30px;
  background: rgba(5, 5, 10, 0.72); backdrop-filter: blur(3px);
}
.gantry {
  display: flex; gap: 18px; padding: 18px 24px; background: #0c0c0c;
  border-radius: 14px; border: 3px solid #2a2a2a; box-shadow: 0 20px 60px #000;
}
.col { display: flex; flex-direction: column; gap: 14px; background: #161616; padding: 14px; border-radius: 10px; }
.lamp {
  width: clamp(44px, 6vw, 90px); aspect-ratio: 1; border-radius: 50%;
  background: #2a0b0b; box-shadow: inset 0 0 12px #000; transition: background 0.08s, box-shadow 0.08s;
}
.lamp.on { background: radial-gradient(circle at 40% 35%, #ff7b6b, #ff1a0a 45%, #b00000); box-shadow: 0 0 30px 6px rgba(255, 30, 10, 0.75); }
.go {
  font-weight: 900; font-style: italic; font-size: clamp(50px, 10vw, 160px); color: var(--green);
  text-shadow: 0 0 40px rgba(0, 210, 106, 0.6);
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.pop-enter-active { animation: pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1); }
@keyframes pop { from { transform: scale(0.3); opacity: 0; } }
</style>
