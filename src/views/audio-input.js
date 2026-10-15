import html from 'choo/html'

export default function audioInput(state, emit) {
  const { t } = state.translation
  const audio = state.audio
  return html`<section id="audio-input" aria-label=${t('audio.title')}
    hidden=${!audio.show || !state.showUI}>
    <strong>${t('audio.title')}</strong>
    <label class="audio-file-label">${t('audio.import')}
      <input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.aif,.aiff"
        disabled=${!audio.ready} onchange=${(event) => {
          emit('audio: import', event.target.files[0])
          event.target.value = ''
        }}>
    </label>
    <span class="audio-filename">${audio.name || t('audio.microphone')}</span>
    ${audio.player}
    <label><input type="checkbox" checked=${audio.player.loop}
      onchange=${(event) => { audio.player.loop = event.target.checked }}>
      ${t('audio.loop')}</label>
    <button type="button" disabled=${!audio.name} onclick=${() => emit('audio: microphone')}>
      ${t('audio.use-microphone')}</button>
    <small>${t('audio.hint')}</small>
    <span role="status">${audio.error}</span>
  </section>`
}
