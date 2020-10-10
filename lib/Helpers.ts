import { isType } from 'strong-typeof'
import { resolve as pathResolve } from 'path'
import { readFileSync } from 'fs'
import { PROJECT_CONFIG, PROJECT_GLOBS } from './Constants'
import type { ProjectToOpenApiConfig } from './Interfaces'

function tryRequire (path: string, fallback: string, json: boolean = false) {
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

export function defaultOptions (options: ProjectToOpenApiConfig) {
  const pj2OpenApiPath = pathResolve('.', PROJECT_CONFIG)

  if (typeof options === 'undefined') {
    options = tryRequire(pj2OpenApiPath, pj2OpenApiPath + '.json')

    if (typeof options !== 'object') {
      options = Object.create(null)
    }
  }

  const getDefinition = filename => {
    const definitionPath = pathResolve('.', filename)

    return tryRequire(definitionPath, definitionPath + 'on')
  }

  let definition

  if (!isType(options.openapiDefinition, 'object') && !isType(options.swaggerDefinition, 'object')) {
    definition = getDefinition('openapi.definition.js')

    if (!isType(definition, 'object')) {
      definition = getDefinition('swagger.definition.js')
    }
  }

  return {
    openapiDefinition: isType(options.openapiDefinition, 'object') ? options.openapiDefinition : definition,
    swaggerDefinition: isType(options.swaggerDefinition, 'object') ? options.swaggerDefinition : definition,
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
