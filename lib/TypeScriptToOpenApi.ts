import { isType } from 'strong-typeof'
import { src, dest } from 'vinyl-fs'
import { createGenerator, Config } from 'ts-json-schema-generator'
import { Transform } from 'stream'
import { resolve as pathResolve } from 'path'
import Vinyl from 'vinyl'
import * as YAML from 'yaml'
import { PROJECT_ASSETS, FOLDERS } from './Constants'
import { defaultOptions } from './Helpers'
import type { ProjectToOpenApiConfig } from './Interfaces'

function createGeneratorConfig (path: string, options: ProjectToOpenApiConfig): Config {
  const { tsconfig, skipTypeCheck = true } = options
  const generatorConfig: Config = {
    path,
    tsconfig,
    skipTypeCheck,
    expose: 'export',
    topRef: true,
    jsDoc: 'extended',
    sortProps: true,
    strictTuples: false,
    extraTags: []
  }

  return generatorConfig
}

function convertNullToNullable (object: any): void {
  if (isType(object.type, 'array')) {
    const index = object.type.indexOf('null')

    if (index === -1) return

    // Remove from anyOf
    object.type.splice(index, 1)
    object.nullable = true

    // Flatten if possible
    if (object.type.length === 1) object.type = object.type[0]
  } else if (isType(object.anyOf, 'array')) {
    // Remove from anyOf
    const index = object.anyOf.findIndex(val => val.type === 'null')

    if (index === -1) return

    object.anyOf.splice(index, 1)
    object.nullable = true

    // Flatten is possible
    if (object.anyOf.length === 1) {
      const type = object.anyOf[0]

      delete object.anyOf

      Object.assign(object, type)
    }
  }
}

function modifySchema (definitions: Record<string, any>, options: ProjectToOpenApiConfig): any {
  if (isType(definitions, 'undefined', 'null')) return

  const {
    expandTypes = [],
    removeProps = [],
    detectGraphQL = true,
    graphQLExpandedTypes = ['Maybe', 'Scalar']
  } = options
  const isExpandable = (key: string, types: string[]) => types.some(type => key.startsWith(`${type}<`))
  const expandableTypes = Object.keys(definitions).filter(name => isExpandable(name, expandTypes))
  const expandableTypeMap = Object.create(null)

  for (const type of expandableTypes) {
    expandableTypeMap['#/definitions/' + encodeURIComponent(type)] = definitions[type]
  }

  // Expand types recursively
  const recurse = (object: Record<string, any>, root: boolean = false) => {
    const result = Object.create(null)

    for (const [key, value] of Object.entries(object || {})) {
      if (removeProps.includes(key)) continue

      if (root) {
        if (expandableTypes.includes(key)) continue

        if (detectGraphQL && isExpandable(key, graphQLExpandedTypes)) {
          // Fix 'null' values for GraphQL Maybe<> types
          convertNullToNullable(value)
        }
      }

      if (isType(value, 'array')) {
        result[key] = value.map(item => {
          if (isType(item, 'object')) {
            return recurse(item)
          }

          return item
        })

        continue
      }

      if (isType(value, 'object')) {
        result[key] = recurse(value)

        continue
      }

      if (key === '$ref' && isType(value, 'string')) {
        if (expandableTypeMap[value]) {
          // Replace the object with the expanded type
          return Object.assign(Object.create(null), expandableTypeMap[value])
        } else {
          result[key] = value.replace('#/definitions/', '#/components/schemas/')
        }

        continue
      }

      result[key] = value
    }

    return result
  }

  return recurse(definitions, true)
}

function convertTypeScript (path: string, options: ProjectToOpenApiConfig): string {
  const { types = '*' } = options
  const definitions = []
  const generator = createGenerator(createGeneratorConfig(path, options))
  const definitionBuilder = type => {
    const schema = generator.createSchema(type)

    definitions.push(modifySchema(schema.definitions, options))
  }

  if (Array.isArray(types)) {
    for (const type of types) {
      definitionBuilder(type)
    }
  } else if (typeof types === 'string') {
    definitionBuilder(types)
  }

  const openapi = {
    components: {
      schemas: Object.assign(Object.create(null), ...definitions)
    }
  }

  return YAML.stringify(openapi)
}

/** Convert TypeScript files to valid OpenAPI YAML formats. */
export async function typeScriptToOpenApi (options?: ProjectToOpenApiConfig): Promise<void> {
  return await new Promise((resolve, reject) => {
    const projectConfig = defaultOptions(options)

    try {
      const { typeScript } = projectConfig

      src(typeScript, { buffer: false })
        .pipe(
          new Transform({
            objectMode: true,
            transform (chunk, encoding, callback) {
              const file = new Vinyl({
                path: chunk.basename.replace(/(.d.ts$|.ts$)/gu, '.components.yaml'),
                contents: Buffer.from(convertTypeScript(chunk.path, projectConfig), encoding)
              })

              chunk.contents.destroy()

              this.push(file)
              callback()
            }
          })
        )
        .pipe(dest(pathResolve('.', PROJECT_ASSETS, FOLDERS.TS)))
        .on('end', () => resolve())
        .on('error', error => reject(error))
    } catch (error) {
      reject(error)
    }
  })
}
