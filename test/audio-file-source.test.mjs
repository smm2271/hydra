import test from 'node:test'
import assert from 'node:assert/strict'
import Meyda from 'meyda'
import AudioFileSource from '../src/lib/audio-file-source.js'

function setup(t) {
  const revoked = []
  const contexts = []
  let nextURL = 0
  const fileAnalyzer = { get: () => 'file loudness' }
  t.mock.method(Meyda, 'createMeydaAnalyzer', () => fileAnalyzer)
  t.mock.method(URL, 'createObjectURL', () => `blob:${++nextURL}`)
  t.mock.method(URL, 'revokeObjectURL', (url) => revoked.push(url))
  const previousWindow = globalThis.window
  globalThis.window = {
    AudioContext: class {
      constructor() { contexts.push(this); this.destination = {} }
      createMediaElementSource(player) {
        this.player = player
        return { connect: (destination) => { this.connected = destination } }
      }
      async resume() { this.resumed = true }
      async close() { this.closed = true }
    }
  }
  t.after(() => { globalThis.window = previousWindow })
  const microphone = { get: () => 'microphone loudness' }
  const audio = {
    meyda: microphone,
    vol: 2, bins: [1, 2], prevBins: [1, 2], fft: [1, 2],
    tick() { this.result = this.meyda?.get() }
  }
  const player = {
    pause() { this.paused = true },
    removeAttribute(name) { delete this[name] },
    load() {}
  }
  const source = new AudioFileSource(audio, player)
  return { source, player, audio, microphone, fileAnalyzer, revoked, contexts }
}

test('files drive analysis without microphone permission, including late microphone initialization', async (t) => {
  const { source, audio, fileAnalyzer, contexts } = setup(t)
  audio.meyda = undefined
  await source.load({ name: 'music.wav' })
  audio.tick()
  assert.equal(audio.result, fileAnalyzer.get())
  const lateMicrophone = { get: () => 'late microphone' }
  audio.meyda = lateMicrophone
  audio.tick()
  assert.equal(audio.result, fileAnalyzer.get())
  assert.equal(audio.meyda, lateMicrophone)
  assert.equal(contexts[0].connected, contexts[0].destination)
  assert.equal(contexts[0].resumed, true)
  source.useMicrophone()
  audio.tick()
  assert.equal(audio.result, 'late microphone')
})

test('replacing files and returning to microphone releases URLs and resets analysis', async (t) => {
  const { source, player, audio, revoked, contexts } = setup(t)
  await source.load({ name: 'one.wav' })
  await source.load({ name: 'two.wav' })
  assert.equal(contexts.length, 1)
  assert.equal(player.src, 'blob:2')
  assert.deepEqual(revoked, ['blob:1'])
  source.useMicrophone()
  assert.deepEqual(revoked, ['blob:1', 'blob:2'])
  assert.equal(player.src, undefined)
  assert.equal(player.paused, true)
  assert.deepEqual(audio.fft, [0, 0])
  audio.tick()
  assert.equal(audio.result, 'microphone loudness')
})

test('analysis failures preserve microphone state and disposal restores the original tick', async (t) => {
  const { source, audio, microphone, contexts } = setup(t)
  await source.load({ name: 'music.wav' })
  source.analyzer = { get() { throw new Error('analysis failed') } }
  assert.throws(() => audio.tick(), /analysis failed/)
  assert.equal(audio.meyda, microphone)
  source.dispose()
  assert.equal(audio.tick, source.originalTick)
  assert.equal(contexts[0].closed, true)
})
