// https://www.youtube.com/watch?v=pUG3Z8Hxa5I
export const PROJECT_ASSETS = '.swagger-wagon'
export const PROJECT_CONFIG = '.pj2openapirc'
export const FOLDERS = {
  SCHEMA: 'json-schema',
  TS: 'typescript'
}
export const PROJECT_GLOBS = [PROJECT_ASSETS + '/' + FOLDERS.TS + '/*.yaml', PROJECT_ASSETS + '/' + FOLDERS.SCHEMA + '/*.yaml']
export const UNSUPPORTED_KEYWORDS = [
  '$schema',
  'additionalItems',
  'const',
  'contains',
  'dependencies',
  'examples',
  'id',
  '$id',
  'patternProperties',
  'propertyNames',
  'if',
  'then',
  'else'
]
