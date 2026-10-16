export default function registerRoutes(app, baseUrl, view) {
  // Choo removes trailing slashes before matching the current pathname.
  const basePath = baseUrl.startsWith('/') ? baseUrl.replace(/\/+$/, '') : ''
  app.route(basePath || '/', view)
  app.route(`${basePath}/dev`, view)
}
