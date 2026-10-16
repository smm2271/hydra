import devtools from 'choo-devtools'
import choo from 'choo'
import store from './src/stores/store.js'
import audioStore from './src/stores/audio-store.js'
import recordingStore from './src/stores/recording-store.js'
import languageStore from './src/stores/language-store.js'
import extensionStore from './src/stores/extension-store.js'
import editorStore from './src/stores/editor-store.js'
import galleryStore from './src/stores/gallery-store.js'

import mainView from './src/views/main.js'
import registerRoutes from './src/lib/routes.js'

const app = choo()
// app.use(devtools())
app.use(store)
app.use(audioStore)
app.use(recordingStore)
app.use(editorStore)
app.use(galleryStore)

app.use(languageStore)
app.use(extensionStore)
registerRoutes(app, import.meta.env.BASE_URL, mainView)
app.mount('body')



