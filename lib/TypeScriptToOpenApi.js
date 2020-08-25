const { src, dest } = require('vinyl-fs')
const { createGenerator } = require('ts-json-schema-generator')
const { Transform } = require('stream')
const { resolve: pathResolve } = require('path')
const Vinyl = require('vinyl')
const YAML = require('yaml')
const { PROJECT_ASSETS, FOLDERS } = require('./Constants')
const { defaultOptions, isType } = require('./Helpers')

function createGeneratorConfig (path, options) {
  const { tsconfig, skipTypeCheck = true } = options
  const generatorConfig = {
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

function convertNullToNullable (object) {
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

function modifySchema (definitions, options) {
  if (isType(definitions, 'undefined', 'null')) return

  const {
    expandTypes = [],
    removeProps = [],
    detectGraphQL = true,
    graphQLExpandedTypes = ['Maybe', 'Scalar']
  } = options
  const isExpandable = (key, types) => types.some(type => key.startsWith(`${type}<`))
  const expandableTypes = Object.keys(definitions).filter(name => isExpandable(name, expandTypes))
  const expandableTypeMap = Object.create(null)

  for (const type of expandableTypes) {
    expandableTypeMap['#/definitions/' + encodeURIComponent(type)] = definitions[type]
  }

  // Expand types recursively
  const recurse = (object, root = false) => {
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

function convertTypeScript (path, options) {
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

async function typeScriptToOpenApi (options) {
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

module.exports = {
  typeScriptToOpenApi
}
