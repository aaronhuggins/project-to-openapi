const { resolve: pathResolve } = require('path')
const { writeFileSync } = require('fs')
const swaggerJSDoc = require('swagger-jsdoc')
const YAML = require('yaml')
const { defaultOptions, isType } = require('./Helpers')
const { jsonSchemaToOpenApi } = require('./JsonSchemaToOpenApi')
const { typeScriptToOpenApi } = require('./TypeScriptToOpenApi')

function removeEmptyJson (object) {
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

async function projectToOpenApi (options) {
  const projectConfig = defaultOptions(options)

  if (!isType(projectConfig.jsonSchema, 'undefined', 'null')) {
    await jsonSchemaToOpenApi(projectConfig)
  }

  if (!isType(projectConfig.typeScript, 'undefined', 'null')) {
    await typeScriptToOpenApi(projectConfig)
  }

  const openapi = removeEmptyJson(
    swaggerJSDoc({
      swaggerDefinition: projectConfig.swaggerDefinition,
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

module.exports = {
  projectToOpenApi
}
