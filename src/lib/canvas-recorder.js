import { recordingMimeType } from './recording-format.js'

export default class CanvasRecorder {
  constructor({ onState, onComplete, onError }) {
    this.onState = onState
    this.onComplete = onComplete
    this.onError = onError
    this.status = 'idle'
    this.attempt = 0
  }

  setStatus(status) {
    this.status = status
    this.onState(status)
  }

  async start(canvas, captureAudio, format = 'auto') {
    if (this.status !== 'idle' || this.disposed) return
    const attempt = ++this.attempt
    this.setStatus('preparing')
    const chunks = []
    let failed = false
    try {
      const audio = await captureAudio?.()
      if (attempt !== this.attempt || this.disposed) {
        audio?.release()
        return
      }
      this.audio = audio
      this.video = canvas.captureStream(30)
      const stream = new MediaStream([
        ...this.video.getVideoTracks(),
        ...(this.audio?.stream.getAudioTracks() || [])
      ])
      const mimeType = recordingMimeType(format, Boolean(this.audio))
      if (!mimeType && format !== 'auto') {
        const error = new Error('Recording format unavailable')
        error.recordingKey = 'format-error'
        throw error
      }
      const recorder = this.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => {
        failed = true
        this.onError('record-error')
        this.stop()
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || chunks[0]?.type || 'video/webm'
        this.cleanup()
        this.setStatus('idle')
        if (this.disposed) return
        if (chunks.length) this.onComplete(new Blob(chunks, { type }))
        else if (!failed) this.onError('empty-error')
      }
      recorder.start(1000)
      this.setStatus('recording')
    } catch (error) {
      if (attempt !== this.attempt || this.disposed) return
      this.cleanup()
      this.setStatus('idle')
      this.onError(error.recordingKey || 'record-error')
    }
  }

  stop() {
    if (this.status === 'preparing') {
      ++this.attempt
      this.setStatus('idle')
      return
    }
    if (!this.recorder || this.status !== 'recording') return
    this.setStatus('stopping')
    if (this.recorder.state !== 'inactive') this.recorder.stop()
  }

  cleanup() {
    this.video?.getTracks().forEach((track) => track.stop())
    this.audio?.release()
    this.video = null
    this.audio = null
    this.recorder = null
  }

  dispose() {
    this.disposed = true
    this.stop()
    this.cleanup()
  }
}
