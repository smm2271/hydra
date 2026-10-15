import AudioFileSource from '../lib/audio-file-source.js'

export default function audioStore(state, emitter) {
  const player = document.createElement('audio')
  player.controls = true
  player.loop = true
  player.preload = 'auto'
  state.audio = { player, ready: false, name: '', error: '', show: false }
  let source
  let selection = 0
  const render = () => emitter.emit('render')
  const message = (key) => state.translation.t(`audio.${key}`)

  emitter.on('hydra loaded', () => {
    source = new AudioFileSource(state.hydra.hydra.synth.a, player)
    state.audio.ready = true
    render()
  })

  emitter.on('audio: toggle', () => {
    state.audio.show = !state.audio.show
    render()
  })

  emitter.on('audio: import', async (file) => {
    if (!file || !source) return
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|aif|aiff|webm)$/i.test(file.name)) {
      state.audio.error = message('invalid-file')
      render()
      return
    }
    const current = ++selection
    state.audio.error = ''
    state.audio.name = file.name
    try {
      await source.load(file)
      if (current !== selection) return
      await player.play()
    } catch (error) {
      if (current !== selection) return
      state.audio.error = message(error.name === 'NotAllowedError' ? 'play-required' : 'load-error')
    }
    render()
  })

  emitter.on('audio: microphone', () => {
    ++selection
    source.useMicrophone()
    if (source.audio.context) {
      source.audio.context.resume().catch(() => {
        state.audio.error = message('mic-error')
        render()
      })
    }
    state.audio.name = ''
    state.audio.error = source.audio.stream ? '' : message('mic-error')
    render()
  })

  player.addEventListener('error', () => {
    if (!state.audio.name) return
    state.audio.error = message('load-error')
    render()
  })
  player.addEventListener('play', () => {
    if (source && source.context) source.context.resume().catch(() => {})
    state.audio.error = ''
    render()
  })
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted && source) source.dispose()
  })
}
