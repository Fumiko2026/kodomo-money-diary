import { createRouter, createWebHistory } from 'vue-router'
import { auth, loadMe } from './auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** ログインしていなくても見られる画面(S1, S2) */
    public?: boolean
    /** 下のタブを出さない画面 */
    hideTabs?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // S1, S2
    { path: '/register', name: 'register', component: () => import('./views/RegisterView.vue'), meta: { public: true, hideTabs: true } },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true, hideTabs: true } },
    // S3
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    // S5, S4
    { path: '/records', name: 'records', component: () => import('./views/RecordsView.vue') },
    { path: '/records/new', name: 'record-new', component: () => import('./views/RecordFormView.vue'), meta: { hideTabs: true } },
    { path: '/records/:id(\\d+)/edit', name: 'record-edit', component: () => import('./views/RecordFormView.vue'), meta: { hideTabs: true } },
    // S6, S7
    { path: '/summary', name: 'summary', component: () => import('./views/SummaryView.vue') },
    { path: '/wishes', name: 'wishes', component: () => import('./views/WishesView.vue') },
    // もっと, S8, S9
    { path: '/more', name: 'more', component: () => import('./views/MoreView.vue') },
    { path: '/categories', name: 'categories', component: () => import('./views/CategoriesView.vue') },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/:rest(.*)*', redirect: { name: 'home' } },
  ],
})

// ログインしていないときは、S1 と S2 だけ見られる
router.beforeEach(async (to) => {
  if (!auth.loaded) await loadMe()
  if (to.meta.public) return auth.me ? { name: 'home' } : true
  return auth.me ? true : { name: 'login' }
})
