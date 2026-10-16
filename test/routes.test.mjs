import test from 'node:test'
import assert from 'node:assert/strict'
import choo from 'choo'
import registerRoutes from '../src/lib/routes.js'

for (const [baseUrl, paths] of [
  ['/hydra/', ['/hydra/', '/hydra', '/hydra/?sketch=test', '/hydra/dev']],
  ['/', ['/', '/?sketch=test', '/dev']],
  ['./', ['/', '/dev']]
]) {
  test(`Choo renders the app with base ${baseUrl}`, () => {
    const app = choo()
    registerRoutes(app, baseUrl, () => ({ outerHTML: '<body>Hydra</body>' }))
    for (const pathname of paths) {
      assert.equal(app.toString(pathname), '<body>Hydra</body>', pathname)
    }
  })
}
