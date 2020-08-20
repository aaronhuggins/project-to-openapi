const LocalWebServer = require('local-web-server')
const open = require('open')
const { projectToOpenApi, defaultOptions } = require('./ProjectToOpenApi')

async function viewOpenApi (options, build = false) {
  const projectConfig = defaultOptions(options)

  if (build) {
    await projectToOpenApi(projectConfig)
  }

  return await new Promise((resolve, reject) => {
    try {
      const { port = 9000 } = projectConfig
      const ws = LocalWebServer.create({
        port,
        directory: './',
        hostname: 'localhost'
      })
      const url =
        'http://localhost:' +
        port.toString() +
        '/node_modules/swagger-ui-dist/index.html?url=../../' +
        projectConfig.filename

      console.log('Serving on port ' + port.toString() + '\n')
      console.log('Browser should open Swagger UI automatically:')
      console.log(url + '\n')

      open(url)

      process.on('SIGINT', () => {
        ws.server.close()
        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  viewOpenApi
}
