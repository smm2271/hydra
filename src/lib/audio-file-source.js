import Meyda from 'meyda'

// Keep microphone initialization independent: Hydra may finish requesting
// microphone permission after a file has already started playing.
export default class AudioFileSource {
  constructor(audio, player) {
    this.audio = audio
    this.player = player
    this.originalTick = audio.tick
    const source = this
    audio.tick = function () {
      const microphoneAnalyzer = this.meyda
      if (source.url) this.meyda = source.analyzer
      try {
        source.originalTick.call(this)
      } finally {
        this.meyda = microphoneAnalyzer
      }
    }
  }

  async load(file) {
    if (!this.context) {
      this.context = new window.AudioContext()
      this.node = this.context.createMediaElementSource(this.player)
      this.node.connect(this.context.destination)
      this.analyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.context,
        source: this.node,
        featureExtractors: ['loudness']
      })
    }
    this.useMicrophone()
    this.url = URL.createObjectURL(file)
    this.player.src = this.url
    this.player.load()
    await this.context.resume()
  }

  useMicrophone() {
    this.player.pause()
    this.player.removeAttribute('src')
    this.player.load()
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = null
    this.audio.vol = 0
    this.audio.bins.fill(0)
    this.audio.prevBins.fill(0)
    this.audio.fft.fill(0)
  }

  captureAudio() {
    if (!this.url || !this.node) return undefined
    const destination = this.context.createMediaStreamDestination()
    this.node.connect(destination)
    return {
      stream: destination.stream,
      release: () => {
        this.node.disconnect(destination)
        destination.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }

  dispose() {
    this.useMicrophone()
    this.audio.tick = this.originalTick
    if (this.context) this.context.close()
  }
}
