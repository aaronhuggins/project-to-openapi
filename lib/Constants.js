// https://www.youtube.com/watch?v=pUG3Z8Hxa5I
const PROJECT_ASSETS = '.swagger-wagon'
const PROJECT_CONFIG = '.pj2openapirc'
const FOLDERS = {
  SCHEMA: 'json-schema',
  TS: 'typescript'
}
const PROJECT_GLOBS = [PROJECT_ASSETS + '/' + FOLDERS.TS + '/*.yaml', PROJECT_ASSETS + '/' + FOLDERS.SCHEMA + '/*.yaml']

module.exports = {
  PROJECT_ASSETS,
  PROJECT_CONFIG,
  PROJECT_GLOBS,
  FOLDERS
}
