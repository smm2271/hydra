import test from 'node:test'
import assert from 'node:assert/strict'
import captureMicrophone from '../src/lib/microphone-recording-source.js'

function setup(t) {
  const previous = globalThis.MediaStream
  globalThis.MediaStream = class {
    constructor(tracks) { this.tracks = tracks }
    getAudioTracks() { return this.tracks.filter((track) => track.kind === 'audio') }
  }
  t.after(() => { globalThis.MediaStream = previous })
}

function track() {
  return {
    kind: 'audio', readyState: 'live',
    stop() { this.readyState = 'ended' },
    clone() { return track() }
  }
}

test('reuses a live microphone through owned clones without stopping FFT input', async (t) => {
  setup(t)
  const original = track()
  const capture = await captureMicrophone({ getAudioTracks: () => [original] }, {
    getUserMedia() { assert.fail('should not request another microphone') }
  })
  const recorded = capture.stream.getAudioTracks()[0]
  assert.notEqual(recorded, original)
  capture.release()
  assert.equal(recorded.readyState, 'ended')
  assert.equal(original.readyState, 'live')
})

test('requests microphone when no live stream exists, and releases its owned stream', async (t) => {
  setup(t)
  const microphone = track()
  const capture = await captureMicrophone({ getAudioTracks: () => [{ readyState: 'ended' }] }, {
    async getUserMedia(constraints) {
      assert.deepEqual(constraints, { audio: true, video: false })
      return { getTracks: () => [microphone] }
    }
  })
  assert.equal(capture.stream.getAudioTracks()[0], microphone)
  capture.release()
  assert.equal(microphone.readyState, 'ended')
})

test('reports permission denial and missing microphone APIs', async (t) => {
  setup(t)
  for (const devices of [{}, { async getUserMedia() { throw new Error('denied') } }]) {
    await assert.rejects(captureMicrophone(undefined, devices), { recordingKey: 'mic-error' })
  }
})
