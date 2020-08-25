const { resolve: pathResolve } = require('path')
const { readFileSync } = require('fs')
const { PROJECT_CONFIG, PROJECT_GLOBS } = require('./Constants')

function isType (value, expectedType, orElseType) {
  const validTypes = [expectedType, orElseType]
  let actualType = value === null ? 'null' : typeof value

  if (validTypes.includes('array')) {
    actualType = Array.isArray(value) ? 'array' : actualType
  }

  return validTypes.includes(actualType)
}

function tryRequire (path, fallback, json = false) {
  if (typeof path === 'string') {
    try {
      if (json) {
        const raw = readFileSync(path, 'utf8')

        return JSON.parse(raw)
      }

      return require(path)
    } catch (e) {
      if (e instanceof SyntaxError && !e.message.includes(' in JSON ')) {
        return tryRequire(path, fallback, true)
      }
    }
  }

  if (typeof fallback === 'string') {
    return tryRequire(fallback, undefined, json)
  }
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
    swaggerDefinition: isType(options.swaggerDefinition, 'object') ? options.swaggerDefinition : swaggerDefinition,
    apis: isType(options.apis, 'array') ? [...PROJECT_GLOBS, ...options.apis] : PROJECT_GLOBS,
    jsonSchema: isType(options.jsonSchema, 'string', 'array') ? options.jsonSchema : undefined,
    typeScript: isType(options.typeScript, 'string', 'array') ? options.typeScript : undefined,
    skipTypeCheck: isType(options.skipTypeCheck, 'boolean') ? options.skipTypeCheck : true,
    tsconfig: isType(options.tsconfig, 'string') ? options.tsconfig : undefined,
    types: isType(options.types, 'string', 'array') ? options.types : '*',
    expandTypes: isType(options.expandTypes, 'array') ? options.expandTypes : [],
    removeProps: isType(options.removeProps, 'array') ? options.removeProps : [],
    detectGraphQL: isType(options.detectGraphQL, 'boolean') ? options.detectGraphQL : true,
    graphQLExpandedTypes: isType(options.graphQLExpandedTypes, 'array')
      ? options.graphQLExpandedTypes
      : ['Maybe', 'Scalar'],
    toYAML: isType(options.toYAML, 'boolean') ? options.toYAML : true,
    filename: isType(options.filename, 'string') ? options.filename : 'openapi.yaml',
    port: isType(options.port, 'number') ? options.port : 9000
  }
}

module.exports = {
  defaultOptions,
  isType
}
