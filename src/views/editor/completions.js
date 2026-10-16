import { parseExpressionAt } from 'acorn'
import transforms from './randomizer/glslTransforms.js'

const globals = [
  'a', 'time', 'speed', 'bpm', 'width', 'height', 'mouse',
  's0', 's1', 's2', 's3', 'o0', 'o1', 'o2', 'o3',
  'render', 'hush', 'setResolution', 'setFunction', 'loadScript', 'update'
]

function isHydraChain(node, sources) {
  if (node.type !== 'CallExpression') return false
  if (node.callee.type === 'Identifier') return sources.has(node.callee.name)
  return node.callee.type === 'MemberExpression' && isHydraChain(node.callee.object, sources)
}

function endsWithHydraChain(code, sources) {
  // Parse candidates without evaluating sketch code. This also recognizes
  // chains inside unfinished expressions, such as modulate(noise().…).
  const identifiers = code.matchAll(/\b[A-Za-z_$][\w$]*\s*\(/g)
  for (const match of identifiers) {
    if (!sources.has(match[0].replace(/\s*\($/, ''))) continue
    // A source name used as an object's method is not a Hydra generator.
    if (/\.$/.test(code.slice(0, match.index).trimEnd())) continue
    try {
      const node = parseExpressionAt(code, match.index, { ecmaVersion: 'latest' })
      if (code.slice(node.end).trim() === '' && isHydraChain(node, sources)) return true
    } catch (_) {
      // An outer expression can be incomplete while an inner chain is valid.
    }
  }
  return false
}

export function hydraCompletions(beforeWord, prefix, definitions = transforms) {
  const sources = new Set(definitions.filter((item) => item.type === 'src').map((item) => item.name))
  const member = /\.\s*$/.test(beforeWord)
  if (member && !endsWithHydraChain(beforeWord.replace(/\.\s*$/, ''), sources)) return []
  const functions = definitions.filter((item) => member ? item.type !== 'src' : item.type === 'src')
  const entries = functions.map((item) => ({
    text: item.name,
    displayText: `${item.name}(${(item.inputs || []).map((input) =>
      `${input.name}${input.default === undefined ? '' : ` = ${JSON.stringify(input.default)}`}`).join(', ')})`
  }))
  entries.push(...(member ? ['out'] : globals).map((text) => ({ text })))
  return entries.filter((item) => item.text.startsWith(prefix))
}

export function createHintProvider(CodeMirror, getDefinitions) {
  return (cm) => {
    const cursor = cm.getCursor()
    const token = cm.getTokenAt(cursor)
    if (/\b(?:string|comment)\b/.test(token.type || '')) return null
    const line = cm.getLine(cursor.line)
    const prefix = line.slice(0, cursor.ch).match(/[\w$]*$/)[0]
    const from = CodeMirror.Pos(cursor.line, cursor.ch - prefix.length)
    const beforeWord = cm.getRange(CodeMirror.Pos(0, 0), from)
    const definitions = getDefinitions?.() || transforms
    const hydra = hydraCompletions(beforeWord, prefix, definitions)
    const javascript = CodeMirror.hint.javascript(cm)
    const entries = new Map(hydra.map((item) => [item.text, item]))
    // Only merge results whose replacement range matches ours.
    if (javascript && javascript.from.line === from.line && javascript.from.ch === from.ch) {
      javascript.list.forEach((item) => {
        const text = typeof item === 'string' ? item : item.text
        if (!entries.has(text)) entries.set(text, item)
      })
    }
    return {
      list: [...entries.values()], from,
      to: CodeMirror.Pos(cursor.line, cursor.ch + line.slice(cursor.ch).match(/^[\w$]*/)[0].length)
    }
  }
}
