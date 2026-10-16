import test from 'node:test'
import assert from 'node:assert/strict'
import { hydraCompletions, createHintProvider } from '../src/views/editor/completions.js'
import formatCode from '../src/views/editor/format-code.js'

const names = (entries) => entries.map((item) => item.text)

test('suggests Hydra generators and parameters at the top level', () => {
  const hints = hydraCompletions('', 'os')
  assert.deepEqual(names(hints), ['osc'])
  assert.match(hints[0].displayText, /frequency = 60/)
  assert.ok(names(hydraCompletions('', 's')).includes('s0'))
  assert.ok(!names(hydraCompletions('', 'ro')).includes('rotate'))
})

test('recognizes multiline and nested Hydra chains without evaluating code', () => {
  for (const code of ['osc().', 'osc()\n  .', 'osc().rotate(0.2).', 'osc().modulate(noise().', 'return osc().']) {
    assert.ok(names(hydraCompletions(code, 'ro')).includes('rotate'), code)
  }
  for (const code of ['Math.', 'Math.sin().', 'thing.osc().', 'console.']) {
    assert.deepEqual(hydraCompletions(code, 'ro'), [], code)
  }
  assert.ok(names(hydraCompletions('osc().', 'ou')).includes('out'))
})

test('uses custom transform definitions from the running synth', () => {
  const definitions = [
    { name: 'customSource', type: 'src', inputs: [] },
    { name: 'customColor', type: 'color', inputs: [{ name: 'amount', default: 1 }] }
  ]
  assert.deepEqual(names(hydraCompletions('', 'custom', definitions)), ['customSource'])
  assert.deepEqual(names(hydraCompletions('customSource().', 'custom', definitions)), ['customColor'])
})

test('hint provider skips comments and strings and replaces the entire word', () => {
  const CodeMirror = {
    Pos: (line, ch) => ({ line, ch }),
    hint: { javascript: () => ({ list: ['osc', 'other'], from: { line: 0, ch: 0 } }) }
  }
  const cm = {
    getCursor: () => ({ line: 0, ch: 2 }),
    getTokenAt: () => ({ type: 'variable' }),
    getLine: () => 'osc',
    getRange: () => ''
  }
  const hint = createHintProvider(CodeMirror)
  const result = hint(cm)
  assert.equal(result.list.filter((item) => (item.text || item) === 'osc').length, 1)
  assert.deepEqual(result.from, { line: 0, ch: 0 })
  assert.deepEqual(result.to, { line: 0, ch: 3 })
  for (const type of ['comment', 'string']) {
    cm.getTokenAt = () => ({ type })
    assert.equal(hint(cm), null)
  }
})

test('formatting uses one undoable edit, retains selection and scroll, and skips unchanged code', () => {
  let value = 'osc(10,0.1,0.8).rotate(0.2).out()'
  const edits = []
  const selection = [{ anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 3 } }]
  const cm = {
    getValue: () => value,
    listSelections: () => selection,
    getScrollInfo: () => ({ left: 0, top: 20 }),
    operation: (fn) => fn(),
    posFromIndex: (index) => ({ line: 0, ch: index }),
    replaceRange(text, from, to, origin) { edits.push({ from, to, origin }); value = text },
    setSelections: (actual) => assert.equal(actual, selection),
    scrollTo: (left, top) => assert.deepEqual([left, top], [0, 20])
  }
  formatCode(cm)
  assert.match(value, /\n {2}\.rotate/)
  assert.equal(edits[0].origin, '+format')
  formatCode(cm)
  assert.equal(edits.length, 1)
})
