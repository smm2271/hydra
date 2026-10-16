export default async function captureMicrophone(existingStream, mediaDevices = navigator.mediaDevices) {
  let tracks = []
  try {
    const existingTracks = existingStream?.getAudioTracks().filter((track) => track.readyState === 'live') || []
    if (existingTracks.length) {
      // Own only clones, so stopping a recording leaves Hydra's FFT input running.
      existingTracks.forEach((track) => tracks.push(track.clone()))
    } else {
      if (!mediaDevices?.getUserMedia) throw new Error('Microphone unavailable')
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false })
      tracks = stream.getTracks()
    }
    if (!tracks.some((track) => track.kind === 'audio' && track.readyState === 'live')) {
      throw new Error('No active microphone track')
    }
    return {
      stream: new MediaStream(tracks),
      release: () => tracks.forEach((track) => track.stop())
    }
  } catch (error) {
    tracks.forEach((track) => track.stop())
    const failure = new Error('Unable to access microphone', { cause: error })
    failure.recordingKey = 'mic-error'
    throw failure
  }
}
