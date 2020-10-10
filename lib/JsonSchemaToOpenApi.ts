import { isType } from 'strong-typeof'
import { src, dest } from 'vinyl-fs'
import { Transform } from 'stream'
import { resolve as pathResolve } from 'path'
import * as YAML from 'yaml'
import { PROJECT_ASSETS, FOLDERS, UNSUPPORTED_KEYWORDS } from './Constants'
import { defaultOptions } from './Helpers'
import type { ProjectToOpenApiConfig } from './Interfaces'

function cleanJsonSchema (schema: Record<string, any>, removeProps: string[] = []): any {
  const result = Object.create(null)
  removeProps = [...UNSUPPORTED_KEYWORDS, ...removeProps]

  for (const [key, value] of Object.entries(schema)) {
    if (removeProps.includes(key)) {
      continue
    }

    if (isType(value, 'array')) {
      if (key === 'type') {
        const oneOf = value.map((typeStr: string) => {
          return { type: typeStr }
        })

        result.oneOf = oneOf
      } else {
        const array = value
          .map(item => {
            if (isType(item, 'object')) {
              return cleanJsonSchema(item)
            }

            return item
          })
          .filter(item => {
            if (isType(item, 'object')) {
              return Object.entries(item).length > 0
            }

            return !isType(item, 'undefined', 'null')
          })

        if (array.length > 0) result[key] = array
      }

      continue
    }

    if (isType(value, 'object')) {
      result[key] = cleanJsonSchema(value)

      continue
    }

    result[key] = value
  }

  return result
}

export async function jsonSchemaToOpenApi (options?: ProjectToOpenApiConfig): Promise<void> {
  return await new Promise((resolve, reject) => {
    const projectConfig = defaultOptions(options)

    try {
      const { jsonSchema, removeProps } = projectConfig

      src(jsonSchema, { buffer: true })
        .pipe(
          new Transform({
            objectMode: true,
            transform (chunk, encoding, callback) {
              const parsed = cleanJsonSchema(YAML.parse(chunk.contents.toString(encoding)), removeProps)
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
