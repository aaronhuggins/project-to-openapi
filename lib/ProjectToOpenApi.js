const { resolve: pathResolve } = require('path')
const { writeFileSync } = require('fs')
const swaggerJSDoc = require('swagger-jsdoc')
const YAML = require('yaml')
const { PROJECT_CONFIG, PROJECT_GLOBS } = require('./Constants')
const { jsonSchemaToOpenApi } = require('./JsonSchemaToOpenApi')
const { typeScriptToOpenApi } = require('./TypeScriptToOpenApi')

function tryRequire (path, fallback) {
  if (typeof path === 'string') {
    try {
      return require(path)
    } catch (e) {}
  }

  if (typeof fallback === 'string') {
    return tryRequire(fallback)
  }
}

function isUndefined (val) {
  return typeof val === 'undefined'
}

function defaultOptions (options) {
  const pj2OpenApiPath = pathResolve('.', PROJECT_CONFIG)

  if (typeof options === 'undefined') {
    options = tryRequire(pj2OpenApiPath, pj2OpenApiPath + '.json')

    if (typeof options !== 'object') {
      options = Object.create(null)
    }
  }

  const swaggerDefPath = pathResolve('.', 'swagger.definition.js')
  const swaggerDefinition = tryRequire(swaggerDefPath, swaggerDefPath + 'on')

  return {
    swaggerDefinition: isUndefined(options.swaggerDefinition) ? swaggerDefinition : options.swaggerDefinition,
    apis: isUndefined(options.apis) ? PROJECT_GLOBS : [...PROJECT_GLOBS, ...options.apis],
    jsonSchema: isUndefined(options.jsonSchema) ? undefined : options.jsonSchema,
    typeScript: isUndefined(options.typeScript) ? undefined : options.typeScript,
    skipTypeCheck: isUndefined(options.skipTypeCheck) ? true : options.skipTypeCheck,
    tsconfig: isUndefined(options.tsconfig) ? undefined : options.tsconfig,
    types: isUndefined(options.types) ? '*' : options.types,
    expandTypes: isUndefined(options.expandTypes) ? [] : options.expandTypes,
    removeProps: isUndefined(options.removeProps) ? [] : options.removeProps,
    detectGraphQL: isUndefined(options.detectGraphQL) ? true : options.detectGraphQL,
    graphQLExpandedTypes: isUndefined(options.graphQLExpandedTypes)
      ? ['Maybe', 'Scalar']
      : options.graphQLExpandedTypes,
    toYAML: isUndefined(options.toYAML) ? true : options.toYAML,
    filename: isUndefined(options.filename) ? 'openapi.yaml' : options.filename,
    port: isUndefined(options.port) ? 9000 : options.port
  }
}

async function projectToOpenApi (options) {
  const projectConfig = defaultOptions(options)

  if (typeof projectConfig.jsonSchema !== 'undefined') {
    await jsonSchemaToOpenApi(projectConfig)
  }

  if (typeof projectConfig.typeScript !== 'undefined') {
    await typeScriptToOpenApi(projectConfig)
  }

  const openapi = swaggerJSDoc({
    swaggerDefinition: projectConfig.swaggerDefinition,
    apis: projectConfig.apis
  })

  if (projectConfig.toYAML) {
    const filename = pathResolve('.', projectConfig.filename.replace(/(.json$|.JSON$|.YAML$)/gu, '.yaml'))

    writeFileSync(filename, YAML.stringify(openapi), 'utf8')
  } else {
    const filename = pathResolve('.', projectConfig.filename.replace(/(.yaml$|.YAML$|.JSON$)/gu, '.json'))

    writeFileSync(filename, JSON.stringify(openapi, null, 2), 'utf8')
  }
}

module.exports = {
  defaultOptions,
  projectToOpenApi
}
