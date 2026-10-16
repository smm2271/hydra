import html from 'choo/html'

export default function toolbar(state, emit) {
    const hidden = state.showInfo ? 'hidden' : ''

    const { t } = state.translation

    const dispatch = (eventName) => (e) => emit(eventName, e)

    const icon = (id, className, title, event) => html`
        <i id="${id}-icon" class="fas icon ${className}" title="${title}" onclick=${dispatch(event)} aria-hidden="true"></i>`

    

    const toggleInfo = state.showInfo ? icon("close", "fa-times", t('toolbar.hide-info'), 'ui: toggle info') : icon("close", "fa-question-circle", t('toolbar.show-info'), 'ui: toggle info') 
    
    const toggleExtensions = !state.showExtensions ? icon("add", "fa-solid fa-puzzle-piece", t('toolbar.load-extension'), 'ui: show extensions') : icon("close", "fa-question-circle", t('toolbar.show-info'), 'ui: hide extensions')  

    return html`<div id="toolbar-container">
        <button id="toggle-code-button" class="editor-toolbar-button" type="button"
          title=${t(state.showCode ? 'toolbar.hide-code' : 'toolbar.show-code')}
          aria-label=${t(state.showCode ? 'toolbar.hide-code' : 'toolbar.show-code')}
          aria-controls="editor-container" aria-expanded=${state.showCode}
          onclick=${dispatch('ui: toggle code')}>
          <i class="fas ${state.showCode ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>
        </button>
        ${icon("run", `fa-play-circle ${hidden}`, t('toolbar.run'), 'editor: eval all')}
        ${icon("clear", `fa fa-trash ${hidden}`, t('toolbar.clear'), 'clear all')}
        <button class="editor-toolbar-button ${hidden}" type="button"
          title=${t('toolbar.autocomplete')} aria-label=${t('toolbar.autocomplete')}
          onclick=${dispatch('editor: autocomplete')}><i class="fas fa-code" aria-hidden="true"></i></button>
        <button class="editor-toolbar-button ${hidden}" type="button"
          title=${t('toolbar.format')} aria-label=${t('toolbar.format')}
          onclick=${dispatch('editor: format code')}><i class="fas fa-indent" aria-hidden="true"></i></button>
        <button id="audio-icon" class="audio-toolbar-button" type="button"
          title=${t('audio.title')} aria-label=${t('audio.title')} aria-expanded=${state.audio.show}
          onclick=${dispatch('audio: toggle')}><i class="fas fa-music" aria-hidden="true"></i></button>
        <button id="recording-button" class="editor-toolbar-button ${state.recording.status === 'recording' ? 'is-recording' : ''}" type="button"
          title=${t('recording.title')} aria-label=${t('recording.title')}
          aria-expanded=${state.recording.show} aria-controls="recording-panel"
          onclick=${dispatch('recording: toggle panel')}><i class="fas fa-video" aria-hidden="true"></i>
          ${state.recording.status === 'recording' ? html`<span class="recording-badge">REC</span>` : ''}</button>
        ${toggleExtensions}
        ${icon("shuffle", `fa-random`, t('toolbar.shuffle'), 'gallery:showExample')}
        ${icon("mutator", `fa-dice ${hidden}`, t('toolbar.random'), 'editor: randomize')}
        ${state.serverURL === null ? '' : icon("share", `fa-upload ${hidden}`, t('toolbar.upload'), 'gallery:shareSketch')}
        ${toggleInfo}
    </div>`

    //        ${icon("share", `fa-upload ${hidden}`, t('toolbar.upload'), 'gallery:shareSketch')}

}
