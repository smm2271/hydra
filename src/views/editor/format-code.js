import beautify from 'js-beautify'

export default function formatCode(cm) {
  const original = cm.getValue()
  const formatted = beautify(original, {
    indent_size: 2,
    indent_with_tabs: false,
    break_chained_methods: true
  })
  if (formatted === original) return
  const selections = cm.listSelections()
  const scroll = cm.getScrollInfo()
  cm.operation(() => {
    // replaceRange preserves undo history, unlike setValue.
    cm.replaceRange(formatted, { line: 0, ch: 0 }, cm.posFromIndex(original.length), '+format')
    cm.setSelections(selections)
    cm.scrollTo(scroll.left, scroll.top)
  })
}
