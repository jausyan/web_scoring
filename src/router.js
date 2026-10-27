import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from './stores/auth'
import { cover, reveal } from './stores/transition'

import Home from './views/Home.vue'
import Display from './views/Display.vue'
import Login from './views/Login.vue'
import Admin from './views/Admin.vue'

const routes = [
  { path: '/', component: Home, meta: { label: 'LCC GRAND PRIX' } },
  { path: '/live', component: Display, props: { filter: 'all' }, meta: { label: 'LIVE' } },
  { path: '/perempat', component: Display, props: { filter: 'quarter' }, meta: { label: 'PEREMPAT FINAL' } },
  { path: '/final', component: Display, props: { filter: 'final' }, meta: { label: 'GRAND FINAL' } },
  { path: '/login', component: Login, meta: { label: 'PIT LANE' } },
  { path: '/admin', component: Admin, meta: { label: 'RACE CONTROL', requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to, from) => {
  if (to.meta.requiresAdmin) {
    const auth = useAuth()
    await auth.waitReady()
    if (!auth.user.value || !auth.pinOk.value) return { path: '/login', query: { next: to.fullPath } }
  }
  // F1 wipe between pages (skip the very first load)
  if (from.matched.length && to.path !== from.path) await cover(to.meta.label)
})

router.afterEach(() => reveal())
