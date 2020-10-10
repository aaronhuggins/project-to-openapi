export interface ProjectToOpenApiConfig {
  /** An array of globs for picking which files contain API information. */
  apis?: string[]
  /** An array of globs for passing json schemas as component schemas.
   * If a title property has been provided in the root of a json schema,
   * that title will be used to name the component schema.
   */
  jsonSchema?: string | string[]
  /** An array of globs for passing typescript files as component schemas.
   * TSDoc and JSDoc tags will be honored if they can be mapped to OAS schema tags.
   */
  typeScript?: string | string[]
  /** Defaults to `swagger.definiton.js` in the current directory. */
  swaggerDefinition?: any
  /** Defaults to `openapi.definiton.js` in the current directory. */
  openapiDefinition?: any
  /** Defaults to built-in compiler options or tsconfig.json in the current directory. */
  tsconfig?: string
  /** @default true */
  skipTypeCheck?: boolean
  /** @default '*' */
  types?: string | string[]
  /** @default [] */
  expandTypes?: string[]
  /**
   * @description Removes properties from schemas during transformation process.
   * @default []
   */
  removeProps?: string[]
  /** @default true */
  detectGraphQL?: boolean
  /** @default ['Maybe', 'Scalar'] */
  graphQLExpandedTypes?: string[]
  /** @default false */
  toYAML?: boolean
  /** @default 'openapi.yaml' */
  filename?: string
  /** @default 9000 */
  port?: number
}
