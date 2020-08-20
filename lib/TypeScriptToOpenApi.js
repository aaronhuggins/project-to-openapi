const { src, dest } = require('vinyl-fs')
const { createGenerator } = require('ts-json-schema-generator')
const { Transform } = require('stream')
const { resolve: pathResolve } = require('path')
const Vinyl = require('vinyl')
const YAML = require('yaml')
const { PROJECT_ASSETS, FOLDERS } = require('./Constants')

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
  if (typeof object.type === 'object' && Array.isArray(object.type)) {
    const index = object.type.indexOf('null')

    if (index === -1) return

    // Remove from anyOf
    object.type.splice(index, 1)
    object.nullable = true

    // Flatten if possible
    if (object.type.length === 1) object.type = object.type[0]
  } else if (typeof object.anyOf === 'object' && Array.isArray(object.anyOf)) {
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

function overwriteObject (dest, src) {
  for (const key of Object.keys(dest)) {
    delete dest[key]
  }

  return Object.assign(dest, src)
}

function isExpandable (key, expandableTypes) {
  return expandableTypes.some(type => key.startsWith(`${type}<`))
}

function modifySchema (schema, options) {
  const {
    expandTypes = [],
    removeProps = [],
    detectGraphQL = true,
    graphQLExpandedTypes = ['Maybe', 'Scalar']
  } = options

  if (!schema.definitions) return

  const { definitions } = schema

  const expandableTypes = Object.keys(definitions).filter(name => isExpandable(name, expandTypes))

  const expandName = name => `#/definitions/${encodeURIComponent(name)}`

  const renamedRef = ref => ref.replace('#/definitions/', '#/components/schemas/')

  const assignToObj = (prev, cur) => Object.assign(prev, { [expandName(cur)]: definitions[cur] })

  const expandableTypeMap = expandableTypes.reduce(assignToObj, Object.create(null))

  // Fix 'null' values for GraphQL Maybe<> types
  if (detectGraphQL) {
    Object.keys(definitions)
      .filter(key => isExpandable(key, graphQLExpandedTypes))
      .forEach(key => {
        const type = definitions[key]
        convertNullToNullable(type)
      })
  }

  // Expand types recursively
  const recurse = obj => {
    if (typeof obj !== 'object') return

    const toRemove = []

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        if (Array.isArray(value))
          value.forEach(value => {
            recurse(value)
          })
        else recurse(value)
      }

      if (key === '$ref' && typeof value === 'string') {
        if (expandableTypeMap[value]) {
          // Replace the object inline with the expanded type
          overwriteObject(obj, expandableTypeMap[value])
          return
        } else {
          obj[key] = renamedRef(value)
        }
      }

      if (removeProps.includes(key)) toRemove.push(key)
    }

    toRemove.forEach(key => {
      delete obj[key]
    })
  }

  recurse(definitions)

  expandableTypes.forEach(type => {
    delete definitions[type]
  })
}

function convertTypeScript (path, options) {
  const { types = '*' } = options
  const definitions = []
  const generator = createGenerator(createGeneratorConfig(path, options))
  const definitionBuilder = type => {
    const schema = generator.createSchema(type)

    modifySchema(schema, options)

    definitions.push(schema.definitions)
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
    try {
      const { typeScript } = options

      src(typeScript, { buffer: false })
        .pipe(
          new Transform({
            objectMode: true,
            transform (chunk, encoding, callback) {
              const file = new Vinyl({
                path: pathResolve('.', PROJECT_ASSETS, chunk.basename.replace(/(.d.ts$|.ts$)/gu, '.components.yaml')),
                contents: Buffer.from(convertTypeScript(chunk.path, options), encoding)
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
