/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

import { init } from '@plausible-analytics/tracker'
// Composables
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Styles
import '@fontsource-variable/recursive/index.css'
import '@/styles/recursive-mono.css'
import 'virtual:uno.css'

init({
  domain: 'pkg-diff.vuetifyjs.com',
})

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
