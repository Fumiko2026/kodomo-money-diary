import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { setUnauthorizedHandler } from './api/client'
import { auth } from './auth'
import { router } from './router'

// 使っている途中で、ログインが切れたら、ログイン画面へ戻す
setUnauthorizedHandler(() => {
  auth.me = null
  void router.push({ name: 'login' })
})

createApp(App).use(router).mount('#app')
