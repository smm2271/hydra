import CanvasRecorder from '../lib/canvas-recorder.js'
import captureMicrophone from '../lib/microphone-recording-source.js'
import { recordingMimeType } from '../lib/recording-format.js'

export default function recordingStore(state, emitter) {
  const recording = state.recording = {
    show: false, ready: false, supported: false, status: 'idle',
    audioSource: 'microphone', format: 'auto', elapsed: 0, error: '', url: '', filename: ''
  }
  const render = () => emitter.emit('render')
  let timer
  let startedAt
  const recorder = new CanvasRecorder({
    onState(status) {
      recording.status = status
      clearInterval(timer)
      if (status === 'recording') {
        startedAt = Date.now()
        recording.elapsed = 0
        timer = setInterval(() => {
          recording.elapsed = Math.floor((Date.now() - startedAt) / 1000)
          render()
        }, 1000)
      }
      render()
    },
    onComplete(blob) {
      if (recording.url) URL.revokeObjectURL(recording.url)
      recording.url = URL.createObjectURL(blob)
      const extension = blob.type.startsWith('video/mp4') ? 'mp4' : 'webm'
      recording.filename = `hydra-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`
      render()
    },
    onError(key) {
      recording.error = key
      render()
    }
  })

  emitter.on('hydra loaded', () => {
    recording.ready = true
    recording.supported = typeof window.MediaRecorder === 'function' &&
      typeof state.hydra.hydra.canvas.captureStream === 'function'
    if (recordingMimeType('mp4', true)) recording.format = 'mp4'
    render()
  })
  emitter.on('recording: toggle panel', () => {
    recording.show = !recording.show
    render()
  })
  emitter.on('recording: start', () => {
    if (!recording.ready || !recording.supported || recording.status !== 'idle') return
    recording.error = ''
    const captureAudio = recording.audioSource === 'microphone'
      ? () => captureMicrophone(state.audio.source?.audio.stream)
      : recording.audioSource === 'file' ? () => {
        const audio = state.audio.source?.captureAudio()
        if (!audio) {
          const error = new Error('No imported audio')
          error.recordingKey = 'file-required'
          throw error
        }
        return audio
      } : undefined
    recorder.start(state.hydra.hydra.canvas, captureAudio, recording.format)
  })
  emitter.on('recording: stop', () => recorder.stop())
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return
    clearInterval(timer)
    recorder.dispose()
    if (recording.url) URL.revokeObjectURL(recording.url)
  })
}
