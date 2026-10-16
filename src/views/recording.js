import html from 'choo/html'
import { recordingMimeType } from '../lib/recording-format.js'

export default function recordingPanel(state, emit) {
  const { t } = state.translation
  const recording = state.recording
  const active = recording.status !== 'idle'
  const elapsed = `${Math.floor(recording.elapsed / 60).toString().padStart(2, '0')}:${(recording.elapsed % 60).toString().padStart(2, '0')}`
  return html`<section id="recording-panel" hidden=${!recording.show}
    aria-label=${t('recording.title')}>
    <strong>${t('recording.title')}</strong>
    <small>${t('recording.hint')}</small>
    <label>${t('recording.format')}
      <select aria-label=${t('recording.format')} disabled=${active} onchange=${(event) => { recording.format = event.target.value }}>
        ${['auto', 'mp4', 'webm'].map((format) => {
          const supported = format === 'auto' || !!recordingMimeType(format, recording.audioSource !== 'none')
          return html`<option value=${format} selected=${recording.format === format} disabled=${!supported}>
            ${t(`recording.format-${format}`)}${supported ? '' : ` (${t('recording.unavailable')})`}
          </option>`
        })}
      </select>
    </label>
    <label>${t('recording.audio-source')}
      <select aria-label=${t('recording.audio-source')} disabled=${active} onchange=${(event) => {
        recording.audioSource = event.target.value
        if (recording.format !== 'auto' && !recordingMimeType(recording.format, recording.audioSource !== 'none')) recording.format = 'auto'
        emit('render')
      }}>
        ${['microphone', 'file', 'none'].map((source) => html`<option value=${source}
          selected=${recording.audioSource === source}>${t(`recording.source-${source}`)}</option>`)}
      </select>
    </label>
    <button type="button" disabled=${!recording.ready || !recording.supported || recording.status === 'stopping'}
      onclick=${() => emit(active ? 'recording: stop' : 'recording: start')}>
      ${t(recording.status === 'preparing' ? 'recording.cancel' : active ? 'recording.stop' : 'recording.start')}</button>
    ${active ? html`<span role="timer">${t(`recording.${recording.status}`)} ${recording.status === 'preparing' ? '' : elapsed}</span>` : ''}
    ${recording.url ? html`<a href=${recording.url} download=${recording.filename}>${t('recording.download')}</a>` : ''}
    <span role="status">${!recording.supported && recording.ready ? t('recording.unsupported') : recording.error ? t(`recording.${recording.error}`) : ''}</span>
  </section>`
}
