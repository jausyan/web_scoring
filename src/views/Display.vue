<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLive } from '../stores/live'
import { play } from '../stores/transition'
import { SCREENS } from '../lib/defaultState'
import QuarterBoard from '../components/QuarterBoard.vue'
import RankingBoard from '../components/RankingBoard.vue'
import RaceTrack from '../components/RaceTrack.vue'
import Podium from '../components/Podium.vue'
import F1Icon from '../components/F1Icon.vue'

/** filter: 'all' follows admin's live screen; 'quarter'/'final' stay within that stage. */
const props = defineProps({ filter: { type: String, default: 'all' } })
const { state, loaded } = useLive()

const COMPONENTS = {
  'quarter-board': QuarterBoard,
  'quarter-ranking': RankingBoard,
  'final-race': RaceTrack,
  'final-podium': Podium,
}

const target = computed(() => {
  const s = state.value.display.screen
  if (props.filter === 'all') return COMPONENTS[s] ? s : 'quarter-board'
  if (s?.startsWith(props.filter)) return s
  return props.filter === 'quarter' ? 'quarter-board' : 'final-race'
})

const shown = ref(null)
watch(
  [target, loaded],
  ([t, l]) => {
    if (!l) return
    if (!shown.value) { shown.value = t; return }
    if (t !== shown.value) play(SCREENS[t].label, state.value.meta.title, () => (shown.value = t))
  },
  { immediate: true },
)

// fullscreen helper (button appears on mouse move)
const showFs = ref(false)
let hideT
const onMove = () => { showFs.value = true; clearTimeout(hideT); hideT = setTimeout(() => (showFs.value = false), 2500) }
const toggleFs = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())
onMounted(() => window.addEventListener('mousemove', onMove))
onBeforeUnmount(() => { window.removeEventListener('mousemove', onMove); clearTimeout(hideT) })
</script>

<template>
  <div class="display">
    <component :is="COMPONENTS[shown]" v-if="shown" :key="shown" />
    <div v-else class="loading"><span class="brand"><span class="logo">LCC</span></span> Memuat…</div>
    <Transition name="fade">
      <div v-if="showFs" class="tools">
        <RouterLink to="/" class="btn sm ghost">Beranda</RouterLink>
        <button class="btn sm" @click="toggleFs">
          <F1Icon name="fullscreen" :size="14" /> Layar Penuh
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.display { height: 100vh; position: relative; }
.loading { height: 100vh; display: grid; place-items: center; font-size: 28px; font-weight: 900; }
.tools { position: fixed; bottom: 16px; right: 16px; display: flex; gap: 8px; z-index: 100; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
