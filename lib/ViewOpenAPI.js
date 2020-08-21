const { existsSync } = require('fs')
const { resolve: pathResolve } = require('path')
const LocalWebServer = require('local-web-server')
const open = require('open')
const { defaultOptions } = require('./Helpers')
const { projectToOpenApi } = require('./ProjectToOpenApi')

function getSwaggerUIPath (filename) {
  const nm = 'node_modules'
  const swagUi = 'swagger-ui-dist'

  if (existsSync(pathResolve('.', nm, swagUi))) {
    return {
      swaggerUI: nm + '/' + swagUi,
      filename: '../../' + filename
    }
  } else {
    return {
      swaggerUI: nm + '/project-to-openapi/' + nm + '/' + swagUi,
      filename: '../../../../' + filename
    }
  }
}

async function viewOpenApi (options, build = false) {
  const projectConfig = defaultOptions(options)
  const uiPaths = getSwaggerUIPath(projectConfig.filename)

  if (build) {
    await projectToOpenApi(projectConfig)
  }

  return await new Promise((resolve, reject) => {
    try {
      const connections = []
      const { port = 9000 } = projectConfig
      const ws = LocalWebServer.create({
        port,
        directory: './',
        hostname: 'localhost'
      })
      const url =
        'http://localhost:' + port.toString() + '/' + uiPaths.swaggerUI + '/index.html?url=' + uiPaths.filename

      ws.server.on('connection', connection => connections.push(connection))

      console.log('Serving on port ' + port.toString() + '\n')
      console.log('Browser should open Swagger UI automatically:')
      console.log(url + '\n')

      open(url)

      process.on('SIGINT', () => {
        ws.server.close()
        connections.forEach(connection => connection.destroy())
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
