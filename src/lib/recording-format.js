export function recordingMimeType(format, withAudio, Recorder = globalThis.MediaRecorder) {
  if (!Recorder?.isTypeSupported) return undefined
  const webm = withAudio
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  const mp4 = withAudio
    ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4']
    : ['video/mp4;codecs=avc1', 'video/mp4']
  const candidates = format === 'mp4' ? mp4 : format === 'webm' ? webm : [...webm, ...mp4]
  return candidates.find((type) => Recorder.isTypeSupported(type))
}
