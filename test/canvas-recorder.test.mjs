import test from 'node:test'
import assert from 'node:assert/strict'
import CanvasRecorder from '../src/lib/canvas-recorder.js'

function setup(t, { fail = false } = {}) {
  const previous = { MediaRecorder: globalThis.MediaRecorder, MediaStream: globalThis.MediaStream }
  const tracks = [{ kind: 'video', stop() { this.stopped = true } }]
  const instances = []
  globalThis.MediaStream = class {
    constructor(tracks) { this.tracks = tracks }
  }
  globalThis.MediaRecorder = class {
    static isTypeSupported(type) { return type.startsWith('video/webm;codecs=vp8') }
    constructor(stream, options) {
      if (fail) throw new Error('encoder unavailable')
      this.stream = stream
      this.mimeType = options.mimeType
      this.state = 'inactive'
      instances.push(this)
    }
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive' }
    finish() {
      this.ondataavailable({ data: new Blob(['video bytes'], { type: this.mimeType }) })
      this.onstop()
    }
  }
  t.after(() => Object.assign(globalThis, previous))
  const states = [], results = [], errors = []
  const recorder = new CanvasRecorder({
    onState: (status) => states.push(status),
    onComplete: (blob) => results.push(blob),
    onError: (key) => errors.push(key)
  })
  const canvas = {
    captureStream(fps) {
      assert.equal(fps, 30)
      return { getVideoTracks: () => tracks, getTracks: () => tracks }
    }
  }
  return { recorder, canvas, tracks, instances, states, results, errors }
}

test('records canvas and imported audio, finalizes a playable blob, and releases only owned tracks', async (t) => {
  const { recorder, canvas, instances, tracks, states, results, errors } = setup(t)
  const audioTrack = { kind: 'audio' }
  let released = false
  await recorder.start(canvas, () => ({
    stream: { getAudioTracks: () => [audioTrack] },
    release: () => { released = true }
  }))
  assert.deepEqual(instances[0].stream.tracks, [tracks[0], audioTrack])
  assert.equal(instances[0].mimeType, 'video/webm;codecs=vp8,opus')
  recorder.start(canvas)
  assert.equal(instances.length, 1)
  recorder.stop()
  assert.equal(recorder.status, 'stopping')
  instances[0].finish()
  assert.deepEqual(states, ['preparing', 'recording', 'stopping', 'idle'])
  assert.equal(tracks[0].stopped, true)
  assert.equal(released, true)
  assert.equal(await results[0].text(), 'video bytes')
  assert.deepEqual(errors, [])
})

test('works without audio and can start another recording after stopping', async (t) => {
  const { recorder, canvas, instances, results } = setup(t)
  await recorder.start(canvas, () => undefined)
  assert.equal(instances[0].stream.tracks.length, 1)
  recorder.stop()
  instances[0].finish()
  await recorder.start(canvas)
  assert.equal(instances.length, 2)
  recorder.stop()
  instances[1].finish()
  assert.equal(results.length, 2)
})

test('encoder startup failure releases capture resources and returns to idle', async (t) => {
  const { recorder, canvas, tracks, errors } = setup(t, { fail: true })
  let released = false
  await recorder.start(canvas, () => ({
    stream: { getAudioTracks: () => [] }, release: () => { released = true }
  }))
  assert.equal(recorder.status, 'idle')
  assert.equal(tracks[0].stopped, true)
  assert.equal(released, true)
  assert.deepEqual(errors, ['record-error'])
})

test('disposal stops capture without generating a download', async (t) => {
  const { recorder, canvas, tracks, instances, results } = setup(t)
  await recorder.start(canvas)
  recorder.dispose()
  instances[0].finish()
  assert.equal(tracks[0].stopped, true)
  assert.equal(results.length, 0)
})

test('encoder errors still finalize partial output and release capture resources', async (t) => {
  const { recorder, canvas, tracks, instances, errors, results } = setup(t)
  await recorder.start(canvas)
  instances[0].onerror()
  instances[0].finish()
  assert.deepEqual(errors, ['record-error'])
  assert.equal(recorder.status, 'idle')
  assert.equal(tracks[0].stopped, true)
  assert.equal(results.length, 1)
})

test('cancelling a pending microphone request releases the late stream without recording', async (t) => {
  const { recorder, canvas, instances } = setup(t)
  let resolveAudio
  let released = false
  const started = recorder.start(canvas, () => new Promise((resolve) => { resolveAudio = resolve }))
  assert.equal(recorder.status, 'preparing')
  recorder.stop()
  assert.equal(recorder.status, 'idle')
  resolveAudio({ stream: {}, release: () => { released = true } })
  await started
  assert.equal(released, true)
  assert.equal(instances.length, 0)
})

test('microphone denial returns to idle with the microphone error and no encoder', async (t) => {
  const { recorder, canvas, instances, errors } = setup(t)
  await recorder.start(canvas, async () => {
    const error = new Error('Permission denied')
    error.recordingKey = 'mic-error'
    throw error
  })
  assert.equal(recorder.status, 'idle')
  assert.deepEqual(errors, ['mic-error'])
  assert.equal(instances.length, 0)
})

test('explicit MP4 produces MP4 data when both formats are supported', async (t) => {
  const { recorder, canvas, instances, results } = setup(t)
  t.mock.method(globalThis.MediaRecorder, 'isTypeSupported', () => true)
  await recorder.start(canvas, undefined, 'mp4')
  assert.match(instances[0].mimeType, /^video\/mp4/)
  recorder.stop()
  instances[0].finish()
  assert.match(results[0].type, /^video\/mp4/)
})

test('unsupported MP4 reports an error instead of silently exporting WebM', async (t) => {
  const { recorder, canvas, instances, errors, tracks } = setup(t)
  await recorder.start(canvas, undefined, 'mp4')
  assert.equal(recorder.status, 'idle')
  assert.equal(instances.length, 0)
  assert.deepEqual(errors, ['format-error'])
  assert.equal(tracks[0].stopped, true)
})
