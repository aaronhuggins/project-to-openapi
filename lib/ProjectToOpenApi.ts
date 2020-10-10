import { isType } from 'strong-typeof'
import { resolve as pathResolve } from 'path'
import { writeFileSync } from 'fs'
import swaggerJSDoc from 'swagger-jsdoc'
import * as YAML from 'yaml'
import { defaultOptions } from './Helpers'
import { jsonSchemaToOpenApi } from './JsonSchemaToOpenApi'
import { typeScriptToOpenApi } from './TypeScriptToOpenApi'
import type { ProjectToOpenApiConfig } from './Interfaces'

function removeEmptyJson (object: Record<string, any>): any {
  if (object === null) return

  const result = Object.create(null)
  const entries = Object.entries(object)

  if (entries.length === 0) return

  for (const [key, value] of entries) {
    if (isType(value, 'array')) {
      if (value.length > 0) {
        const valueResult = value
          .map(item => {
            if (isType(item, 'object')) {
              return removeEmptyJson(item)
            }

            return item
          })
          .filter(item => !isType(item, 'undefined', 'null'))

        if (valueResult.length > 0) result[key] = valueResult
      }

      continue
    }

    if (isType(value, 'object')) {
      const valueResult = removeEmptyJson(value)

      if (!isType(valueResult, 'undefined', 'null')) result[key] = valueResult

      continue
    }

    result[key] = value
  }

  return result
}

/** Read JSDoc, JSON schema, and TypeScript definition files to construct an OpenAPI definition. */
export async function projectToOpenApi (options?: ProjectToOpenApiConfig): Promise<void> {
  const projectConfig = defaultOptions(options)

  if (!isType(projectConfig.jsonSchema, 'undefined', 'null')) {
    await jsonSchemaToOpenApi(projectConfig)
  }

  if (!isType(projectConfig.typeScript, 'undefined', 'null')) {
    await typeScriptToOpenApi(projectConfig)
  }

  const openapi = removeEmptyJson(
    swaggerJSDoc({
      swaggerDefinition: projectConfig.openapiDefinition || projectConfig.swaggerDefinition,
      apis: projectConfig.apis
    })
  )

  if (projectConfig.toYAML) {
    const filename = pathResolve('.', projectConfig.filename.replace(/(.json$|.JSON$|.YAML$)/gu, '.yaml'))

    writeFileSync(filename, YAML.stringify(openapi), 'utf8')
  } else {
    const filename = pathResolve('.', projectConfig.filename.replace(/(.yaml$|.YAML$|.JSON$)/gu, '.json'))

    writeFileSync(filename, JSON.stringify(openapi, null, 2), 'utf8')
  }
}
