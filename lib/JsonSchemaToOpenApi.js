const { src, dest } = require('vinyl-fs')
const { Transform } = require('stream')
const { resolve: pathResolve } = require('path')
const YAML = require('yaml')
const { PROJECT_ASSETS, FOLDERS, UNSUPPORTED_KEYWORDS } = require('./Constants')

function cleanJsonSchema (schema) {
  const result = Object.create(null)

  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_KEYWORDS.includes(key)) {
      continue
    }

    if (Array.isArray(value)) {
      if (key === 'type') {
        const oneOf = value.map(typeStr => {
          return { type: typeStr }
        })

        result.oneOf = oneOf
      } else {
        const array = value
          .map(item => {
            if (typeof item === 'object' && !Array.isArray(item)) {
              return cleanJsonSchema(item)
            }

            return item
          })
          .filter(item => {
            if (typeof item === 'object' && !Array.isArray(item)) {
              return Object.entries(item).length > 0
            }

            return true
          })

        if (array.length > 0) result[key] = array
      }

      continue
    }

    if (typeof value === 'object') {
      result[key] = cleanJsonSchema(value)

      continue
    }

    result[key] = value
  }

  return result
}

async function jsonSchemaToOpenApi (options) {
  return await new Promise((resolve, reject) => {
    try {
      src(options.jsonSchema, { buffer: true })
        .pipe(
          new Transform({
            objectMode: true,
            transform (chunk, encoding, callback) {
              const parsed = cleanJsonSchema(YAML.parse(chunk.contents.toString(encoding)))
              const { title } = parsed
              const components = { schemas: { [title]: parsed } }

              delete parsed.title

              chunk.basename = title ? title + '.components.yaml' : chunk.basename.replace(/.json$/gu, '.yaml')
              chunk.contents = Buffer.from(YAML.stringify({ components }), 'utf8')

              this.push(chunk)
              callback()
            }
          })
        )
        .pipe(dest(pathResolve('.', PROJECT_ASSETS, FOLDERS.SCHEMA)))
        .on('end', () => resolve())
        .on('error', error => reject(error))
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  jsonSchemaToOpenApi
}
